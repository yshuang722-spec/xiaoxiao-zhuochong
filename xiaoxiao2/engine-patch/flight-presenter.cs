using System;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;
using System.Collections.Generic;
using System.Text;

internal static class FlightPresenter {
    [StructLayout(LayoutKind.Sequential)] struct Point { public int x, y; }
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int l,t,r,b; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    struct MonitorInfo {
        public int size; public Rect monitor, work; public uint flags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string device;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct Adapter { public IntPtr dc; public uint handle, luidLow; public int luidHigh; public uint source; }
    [StructLayout(LayoutKind.Sequential)] struct VBlank { public uint adapter, device, source; }
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern IntPtr MonitorFromPoint(Point p, uint flags);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] static extern IntPtr CreateDC(string driver,string device,string output,IntPtr init);
    [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr dc);
    [DllImport("gdi32.dll")] static extern int D3DKMTOpenAdapterFromHdc(ref Adapter adapter);
    [DllImport("gdi32.dll")] static extern int D3DKMTCloseAdapter(ref uint handle);
    [DllImport("gdi32.dll")] static extern int D3DKMTWaitForVerticalBlankEvent(ref VBlank wait);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int w, int h, uint flags);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
    [DllImport("avrt.dll", CharSet=CharSet.Unicode)] static extern IntPtr AvSetMmThreadCharacteristics(string task, ref uint index);
    [DllImport("avrt.dll")] static extern bool AvSetMmThreadPriority(IntPtr task, int priority);
    [DllImport("avrt.dll")] static extern bool AvRevertMmThreadCharacteristics(IntPtr task);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool SetProp(IntPtr hwnd,string name,IntPtr value);
    static readonly AutoResetEvent changed = new AutoResetEvent(false);
    static readonly object gate = new object();
    static readonly List<Sample> samples = new List<Sample>(12);
    struct Sample { public double time,x,y,vx,vy; }
    static IntPtr window, monitor;
    static long impact=-1;
    static int revision;
    static bool done,active,firstPose;
    static double offset;
    static double Now() { return Stopwatch.GetTimestamp()*(1000.0/Stopwatch.Frequency); }

    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hwnd, uint command);
    [DllImport("user32.dll", EntryPoint="GetWindowLongW")] static extern int GetWindowStyle(IntPtr hwnd, int index);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder name, int capacity);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int attribute, out int value, int bytes);

    static bool NeedsTopmostRepair() {
        Rect pet;
        if (!IsWindowVisible(window) || !GetWindowRect(window,out pet)) return false;
        if ((GetWindowStyle(window,-20) & 8) == 0) return true;
        var name = new StringBuilder(128);
        var above = window;
        // Only overlapping ordinary application windows indicate a lost topmost band.
        // The shell, other overlays and cloaked windows may legitimately sit above us.
        for (int i=0; i<512; i++) {
            above = GetWindow(above,3); // GW_HWNDPREV
            if (above == IntPtr.Zero) break;
            if ((GetWindowStyle(above,-20) & (8|0x80|0x08000000)) != 0 ||
                !IsWindowVisible(above) || IsIconic(above)) continue;
            Rect r;
            if (!GetWindowRect(above,out r) || r.r<=pet.l || r.l>=pet.r || r.b<=pet.t || r.t>=pet.b) continue;
            int cloaked;
            if (DwmGetWindowAttribute(above,14,out cloaked,4)==0 && cloaked!=0) continue;
            GetClassName(above,name,name.Capacity);
            var kind=name.ToString();
            if (kind=="Shell_TrayWnd" || kind=="Shell_SecondaryTrayWnd" || kind=="Progman" || kind=="WorkerW") continue;
            return true;
        }
        return false;
    }

    static void ReadCommands() {
        try {
            string line;
            while ((line=Console.ReadLine())!=null) {
                if (line=="Z") {
                    if (NeedsTopmostRepair()) Console.WriteLine("raise");
                    continue;
                }
                var words=line.Split(' ');
                if(words[0]=="P" && words.Length==2) {
                    lock(gate) { active=false;revision++;samples.Clear(); }
                    Console.WriteLine("idle "+words[1]);
                    changed.Set();continue;
                }
                if(words.Length!=9 || words[0]!="M")continue;
                long epoch; double time,x,y,vx,vy;int cx,cy;
                if(!long.TryParse(words[1],out epoch)||!double.TryParse(words[2],out time)||
                   !double.TryParse(words[3],out x)||!double.TryParse(words[4],out y)||
                   !double.TryParse(words[5],out vx)||!double.TryParse(words[6],out vy)||
                   !int.TryParse(words[7],out cx)||!int.TryParse(words[8],out cy))continue;
                var output=MonitorFromPoint(new Point{x=cx,y=cy},2);
                lock(gate) {
                    bool wake=!active || monitor!=output;
                    if(!active || impact!=epoch) {samples.Clear();firstPose=true;offset=Now()-time;}
                    offset=Math.Min(offset,Now()-time);
                    active=true;impact=epoch;
                    if(samples.Count==12)samples.RemoveAt(0);
                    samples.Add(new Sample{time=time,x=x,y=y,vx=vx,vy=vy});
                    if(wake){monitor=output;revision++;changed.Set();}
                }
            }
        } finally {lock(gate){done=true;revision++;}changed.Set();}
    }

    static void Present(int version) {
        lock(gate) {
            if(!active||revision!=version||samples.Count==0)return;
            // Interpolate between physics reports. Extrapolate at most one short frame
            // during a scheduling hiccup. A new collision discards the old trajectory.
            double t=firstPose ? samples[0].time : Now()-offset-14;
            firstPose=false;
            int i=samples.Count-1;
            while(i>0 && samples[i].time>t)i--;
            var a=samples[i];double x=a.x,y=a.y;
            if(i+1<samples.Count){
                var b=samples[i+1];double dt=b.time-a.time;
                double f=dt>0?Math.Max(0,Math.Min(1,(t-a.time)/dt)):0;
                x+=(b.x-a.x)*f;y+=(b.y-a.y)*f;
            }else{
                double dt=Math.Max(0,Math.Min(22,t-a.time))/1000;
                x+=a.vx*dt;y+=a.vy*dt;
            }
            // Move asynchronously without activation or z-order changes. Allow Windows
            // to repaint the newly exposed background, including Explorer's taskbar. Keep the parent's
            // DWM surface, dimensions, focus and z-order while presenting its new origin.
            if(!SetWindowPos(window,IntPtr.Zero,(int)Math.Round(x),(int)Math.Round(y),0,0,0x4615))
                throw new InvalidOperationException("Window movement failed");
        }
    }

    [StructLayout(LayoutKind.Explicit, Size=220)] struct DisplayMode {
        [FieldOffset(68)] public ushort size;
        [FieldOffset(184)] public uint hz;
    }
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern bool EnumDisplaySettings(string display,int mode,ref DisplayMode settings);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr CreateWaitableTimerEx(IntPtr attributes,string name,uint flags,uint access);
    [DllImport("kernel32.dll")] static extern bool SetWaitableTimer(IntPtr timer,ref long due,int period,IntPtr callback,IntPtr context,bool resume);
    [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint timeout);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);

    static bool WaitUntil(IntPtr timer,double deadline) {
        double delay=deadline-Now();
        if(delay<=0)return true;
        long due=-Math.Max(1L,(long)(delay*10000));
        return SetWaitableTimer(timer,ref due,0,IntPtr.Zero,IntPtr.Zero,false) && WaitForSingleObject(timer,250)==0;
    }
    static bool RunDisplay(IntPtr display,int version) {
        var info=new MonitorInfo{size=Marshal.SizeOf(typeof(MonitorInfo))};
        if(!GetMonitorInfo(display,ref info))return false;
        var adapter=new Adapter{dc=CreateDC("DISPLAY",info.device,null,IntPtr.Zero)};
        if(adapter.dc==IntPtr.Zero)return false;
        try {
            if(D3DKMTOpenAdapterFromHdc(ref adapter)!=0)return false;
            try {
                var wait=new VBlank{adapter=adapter.handle,source=adapter.source};
                var settings=new DisplayMode{size=220};
                var timer=IntPtr.Zero;
                if(EnumDisplaySettings(info.device,-1,ref settings) && settings.hz>=24 && settings.hz<=1000)
                    timer=CreateWaitableTimerEx(IntPtr.Zero,null,2,0x00100002);
                try {
                    double period=1000.0/Math.Max(1,settings.hz), deadline=0, resync=0;
                    while(Volatile.Read(ref revision)==version) {
                        // Submit before the compositor's next refresh. Periodically re-anchor
                        // to this output to accommodate fractional refresh rates and drift.
                        if(timer==IntPtr.Zero || Now()>=resync) {
                            if(D3DKMTWaitForVerticalBlankEvent(ref wait)!=0)return false;
                            double blank=Now();
                            deadline=blank+period-Math.Min(2,period/3);
                            resync=blank+1500;
                        }
                        if(timer!=IntPtr.Zero && !WaitUntil(timer,deadline))return false;
                        Present(version);
                        deadline+=period;
                        double late=Now()-deadline;
                        if(late>=period)deadline+=Math.Floor(late/period)*period;
                    }
                } finally {if(timer!=IntPtr.Zero)CloseHandle(timer);}
            } finally {D3DKMTCloseAdapter(ref adapter.handle);}
        } finally {DeleteDC(adapter.dc);}
        return true;
    }
    public static int Main(string[] args) {
        CultureInfo.DefaultThreadCurrentCulture=CultureInfo.InvariantCulture;
        SetProcessDPIAware();
        Thread.CurrentThread.Priority = ThreadPriority.Highest;
        long handle;uint owner,pid;
        if(args.Length!=2||!long.TryParse(args[0],out handle)||!uint.TryParse(args[1],out owner))return 1;
        window=new IntPtr(handle);GetWindowThreadProcessId(window,out pid);if(pid!=owner)return 1;
        SetProp(window,"NonRudeHWND",new IntPtr(1));
        new Thread(ReadCommands){IsBackground=true}.Start();
        try {
            Console.WriteLine("ready");
            while(true) {
                changed.WaitOne();IntPtr display;int version;
                lock(gate){if(done)return 0;if(!active)continue;display=monitor;version=revision;}
                uint index=0;
                IntPtr task=AvSetMmThreadCharacteristics("Games",ref index);
                try {
                    if(task!=IntPtr.Zero)AvSetMmThreadPriority(task,1);
                    if(!RunDisplay(display,version))return 2;
                }
                finally {if(task!=IntPtr.Zero)AvRevertMmThreadCharacteristics(task);}
            }
        } catch(System.IO.IOException){return 0;}
    }
}
