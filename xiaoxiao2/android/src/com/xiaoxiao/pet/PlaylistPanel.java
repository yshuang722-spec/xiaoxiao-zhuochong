package com.xiaoxiao.pet;
import android.app.*;import android.content.Context;import android.graphics.Color;import android.os.*;import android.view.*;import android.view.animation.*;import android.widget.*;import java.util.*;

/** 轮播编排（与电脑端同一套交互）：开关、顺序列表（⠿ 拖动、↑↓、插入、✕）、全部动作小标签（点一下加到末尾）；所有增删换位都有过渡动画。改动立即生效（轮播每次现读列表）。 */
final class PlaylistPanel {
 static final class Item{final long id;final String name;Item(long id,String name){this.id=id;this.name=name;}}
 /** 自动换行的标签容器。 */
 static final class Flow extends ViewGroup{
  final int gap;Flow(Context c,int gap){super(c);this.gap=gap;}
  @Override protected void onMeasure(int wSpec,int hSpec){int w=MeasureSpec.getSize(wSpec),x=0,y=0,rowH=0;for(int i=0;i<getChildCount();i++){View c=getChildAt(i);if(c.getVisibility()==GONE)continue;c.measure(MeasureSpec.makeMeasureSpec(w,MeasureSpec.AT_MOST),MeasureSpec.makeMeasureSpec(0,MeasureSpec.UNSPECIFIED));int cw=c.getMeasuredWidth(),ch=c.getMeasuredHeight();if(x>0&&x+cw>w){x=0;y+=rowH+gap;rowH=0;}x+=cw+gap;rowH=Math.max(rowH,ch);}setMeasuredDimension(w,y+rowH);}
  @Override protected void onLayout(boolean changed,int l,int t,int r,int b){int w=r-l,x=0,y=0,rowH=0;for(int i=0;i<getChildCount();i++){View c=getChildAt(i);if(c.getVisibility()==GONE)continue;int cw=c.getMeasuredWidth(),ch=c.getMeasuredHeight();if(x>0&&x+cw>w){x=0;y+=rowH+gap;rowH=0;}c.layout(x,y,x+cw,y+ch);x+=cw+gap;rowH=Math.max(rowH,ch);}}
 }
 final MainActivity activity;final String role;final LinearLayout rows;final TextView hint;final ScrollView scroll;AlertDialog dialog;
 final ArrayList<Item> items=new ArrayList<>();long seq=0;boolean dragging;long insertAfterId=-1;
 /** 把按钮排成等宽两列的整齐网格（所有动作按钮一样大、同一套样式）。 */
 static LinearLayout grid(MainActivity a,List<Button> btns){LinearLayout col=a.column();int gap=a.dp(8);
  for(int i=0;i<btns.size();i+=2){LinearLayout row=new LinearLayout(a);for(int k=0;k<2;k++){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,a.dp(48),1);lp.rightMargin=k==0?gap:0;lp.bottomMargin=gap;if(i+k<btns.size()){Button b=btns.get(i+k);b.setSingleLine(true);b.setEllipsize(android.text.TextUtils.TruncateAt.END);b.setTextSize(16);b.setPadding(a.dp(10),0,a.dp(10),a.dp(3));b.setMinWidth(0);b.setMinimumWidth(0);row.addView(b,lp);}else row.addView(new View(a),lp);}col.addView(row,new LinearLayout.LayoutParams(-1,-2));}
  return col;}
 /** 底部操作栏：所有按钮同高同风格，最后一个（完成）为实心主按钮。 */
 static LinearLayout bar(MainActivity a,String[] labels,View.OnClickListener[] acts){LinearLayout bar=new LinearLayout(a);bar.setPadding(0,a.dp(10),0,0);
  for(int i=0;i<labels.length;i++){Button b=new Button(a);b.setText(labels[i]);Sticker.pill(b,i==labels.length-1);b.setTextSize(15);b.setSingleLine(true);b.setPadding(a.dp(6),0,a.dp(6),a.dp(3));b.setMinWidth(0);b.setMinimumWidth(0);b.setOnClickListener(acts[i]);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,a.dp(46),1);if(i<labels.length-1)lp.rightMargin=a.dp(8);bar.addView(b,lp);}
  return bar;}
 PlaylistPanel(MainActivity a,String role){activity=a;this.role=role;for(String n:Data.playlist(role))items.add(new Item(++seq,n));LinearLayout content=a.column();content.setPadding(a.dp(16),0,a.dp(16),a.dp(8));
  PetService service=PetService.instance;final PetService.Pet pet=service==null?null:service.pets.get(role);
  LinearLayout sw=GroupedList.group(content);Switch rotation=GroupedList.toggle(sw,"自动轮播动作",pet!=null&&pet.rotation,(b,on)->{if(pet!=null){pet.rotation=on;pet.nextAction=SystemClock.uptimeMillis()+5000;PetService.instance.save();}});rotation.setEnabled(pet!=null);
  hint=a.text("",12);hint.setTextColor(Apple.SECONDARY);hint.setPadding(a.dp(2),a.dp(8),0,a.dp(4));content.addView(hint);
  scroll=new SpringScrollView(a);rows=a.column();scroll.addView(rows);content.addView(scroll,new LinearLayout.LayoutParams(-1,Math.min(a.dp(420),a.getResources().getDisplayMetrics().heightPixels*55/100)));
  content.addView(bar(a,new String[]{"恢复默认","清空列表","完成"},new View.OnClickListener[]{v->{Data.resetPlaylist(role);items.clear();for(String n:Data.playlist(role))items.add(new Item(++seq,n));insertAfterId=-1;refresh();},v->change(()->{insertAfterId=-1;items.clear();},true),v->dialog.dismiss()}));
  dialog=new Apple.Builder(a).setTitle(Data.name(role)+" · 轮播编排").setView(content).create();refresh();}
 void show(){dialog.show();Apple.dialog(dialog);}
 ArrayList<String> names(){ArrayList<String> out=new ArrayList<>();for(Item i:items)out.add(i.name);return out;}
 void save(){Data.playlist(role,names());}
 // 先记下每行位置，改完重建后让每行从旧位置滑到新位置，新增的行淡入放大
 HashMap<Long,Integer> snapshot(){HashMap<Long,Integer> m=new HashMap<>();for(int i=0;i<rows.getChildCount();i++){View v=rows.getChildAt(i);if(v.getTag() instanceof Long)m.put((Long)v.getTag(),v.getTop());}return m;}
 void change(Runnable mutate,boolean animate){HashMap<Long,Integer> prev=animate?snapshot():null;mutate.run();save();refresh();if(prev!=null)flip(prev);}
 void flip(final HashMap<Long,Integer> prev){rows.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener(){public boolean onPreDraw(){rows.getViewTreeObserver().removeOnPreDrawListener(this);
  for(int i=0;i<rows.getChildCount();i++){View v=rows.getChildAt(i);if(!(v.getTag() instanceof Long))continue;Integer old=prev.get((Long)v.getTag());
   if(old==null){v.setAlpha(0f);v.setScaleX(.92f);v.setScaleY(.92f);v.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(280).setInterpolator(new OvershootInterpolator(1.4f)).start();}
   else if(Math.abs(old-v.getTop())>1){v.setTranslationY(old-v.getTop());v.animate().translationY(0).setDuration(280).setInterpolator(new DecelerateInterpolator(2f)).start();}}
  return true;}});}
 Button small(String text,boolean enabled,View.OnClickListener click){Button b=new Button(activity);b.setText(text);Sticker.pill(b,false);b.setTextSize(16);b.setPadding(activity.dp(6),0,activity.dp(6),activity.dp(3));b.setMinWidth(0);b.setMinimumWidth(0);b.setEnabled(enabled);b.setAlpha(enabled?1f:.35f);b.setOnClickListener(click);return b;}
 TextView head(String s){TextView t=Apple.label(activity,s,14,true);t.setPadding(activity.dp(2),activity.dp(14),0,activity.dp(4));return t;}
 Button chip(String text,boolean used){Button b=new Button(activity);b.setText(text);Sticker.pill(b,used);b.setTextSize(16);b.setPadding(activity.dp(18),0,activity.dp(18),activity.dp(3));b.setMinWidth(0);b.setMinimumWidth(0);return b;}
 void removeAnimated(final Item it,final View row){row.setEnabled(false);row.animate().alpha(0f).translationX(activity.dp(40)).setDuration(170).setInterpolator(new AccelerateInterpolator()).withEndAction(()->change(()->{items.remove(it);if(insertAfterId==it.id)insertAfterId=-1;},true)).start();}
 void pickInsert(final int at){
  LinearLayout box=activity.column();box.setPadding(activity.dp(16),0,activity.dp(16),activity.dp(8));
  TextView tip=activity.text("选一个动作，插到第 "+(at+1)+" 项后面",13);tip.setTextColor(Apple.SECONDARY);tip.setPadding(0,0,0,activity.dp(8));box.addView(tip);
  ScrollView sv=new SpringScrollView(activity);ArrayList<Button> cs=new ArrayList<>();final AlertDialog[] dh=new AlertDialog[1];
  for(final String name:Data.allActions(role)){Button c=chip(name,false);c.setOnClickListener(v->{dh[0].dismiss();change(()->items.add(Math.min(at+1,items.size()),new Item(++seq,name)),true);});cs.add(c);}
  sv.addView(grid(activity,cs));
  box.addView(sv,new LinearLayout.LayoutParams(-1,Math.min(activity.dp(380),activity.getResources().getDisplayMetrics().heightPixels*55/100)));
  box.addView(bar(activity,new String[]{"取消"},new View.OnClickListener[]{v->dh[0].dismiss()}));
  final AlertDialog d=new Apple.Builder(activity).setTitle("插入动作").setView(box).create();dh[0]=d;
  d.show();Apple.dialog(d);}
 void refresh(){
  hint.setText((Data.playlistSaved(role)?"":"目前是默认顺序，改动后会保存为你自己的顺序。")+"按住 ⠿ 拖动换位，或点 ↑ ↓；「＋ 插入」在这一项后面加动作；同一动作可重复。每约 20 秒换下一个。");
  rows.removeAllViews();rows.addView(head("轮播顺序"));
  if(items.isEmpty()){TextView empty=activity.text("列表是空的：在下方「全部动作」点一下加入。",14);empty.setTextColor(Apple.SECONDARY);empty.setPadding(activity.dp(4),activity.dp(10),0,activity.dp(10));rows.addView(empty);}
  for(int i=0;i<items.size();i++){final int at=i;final Item it=items.get(i);
   final LinearLayout row=new LinearLayout(activity);row.setOrientation(1);row.setTag(it.id);
   LinearLayout line=new LinearLayout(activity);line.setGravity(Gravity.CENTER_VERTICAL);line.setPadding(activity.dp(2),activity.dp(3),0,activity.dp(3));
   TextView grip=Apple.label(activity,"⠿",20,true);grip.setGravity(Gravity.CENTER);grip.setTextColor(Apple.SECONDARY);line.addView(grip,new LinearLayout.LayoutParams(activity.dp(34),activity.dp(40)));
   TextView no=Apple.label(activity,String.valueOf(i+1),13,true);no.setGravity(Gravity.CENTER);no.setTextColor(Color.WHITE);no.setBackground(Apple.shape(activity,Sticker.roleColor(activity,role),99));line.addView(no,new LinearLayout.LayoutParams(activity.dp(26),activity.dp(26)));
   TextView t=Apple.label(activity,it.name,15,true);t.setSingleLine(true);t.setEllipsize(android.text.TextUtils.TruncateAt.END);t.setPadding(activity.dp(10),0,activity.dp(4),0);line.addView(t,new LinearLayout.LayoutParams(0,-2,1));
   row.addView(line,new LinearLayout.LayoutParams(-1,-2));
   LinearLayout btns=new LinearLayout(activity);btns.setPadding(activity.dp(36),0,0,activity.dp(6));
   String[] lab={"↑ 上移","↓ 下移","＋ 插入","✕ 删除"};
   for(int k=0;k<4;k++){final int kk=k;boolean en=k==0?at>0:k==1?at<items.size()-1:true;
    Button bt=small(lab[k],en,v->{if(kk==0)change(()->Collections.swap(items,at,at-1),true);else if(kk==1)change(()->Collections.swap(items,at,at+1),true);else if(kk==2)pickInsert(at);else removeAnimated(it,row);});
    LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(0,activity.dp(44),1);if(k<3)bp.rightMargin=activity.dp(6);btns.addView(bt,bp);}
   row.addView(btns,new LinearLayout.LayoutParams(-1,-2));
   attachDrag(grip,row,at);
   rows.addView(row,new LinearLayout.LayoutParams(-1,-2));}
  rows.addView(head("全部动作（点一下加到末尾）"));
  ArrayList<Button> pb=new ArrayList<>();
  for(final String name:Data.allActions(role)){int count=0;for(Item i:items)if(i.name.equals(name))count++;
   Button b=chip(name+(count>0?"  ×"+count:""),count>0);b.setOnClickListener(v->change(()->{insertAfterId=-1;items.add(new Item(++seq,name));},true));pb.add(b);}
  View pool=grid(activity,pb);
  rows.addView(pool,new LinearLayout.LayoutParams(-1,-2));
 }
 // 按住左侧 ⠿ 立即拖动：被拖行跟手并抬起，其余行让位滑动，松手落位后写盘（「插入」面板展开时不能拖）
 void attachDrag(final View handle,final View row,final int from){
  final float[] down=new float[2];final boolean[] armed=new boolean[1];
  final int[] to=new int[1];final ArrayList<View> slots=new ArrayList<>();
  handle.setOnTouchListener((tv,e)->{
   switch(e.getActionMasked()){
    case MotionEvent.ACTION_DOWN:
     if(dragging)return true;
     if(insertAfterId>=0){insertAfterId=-1;HashMap<Long,Integer> prev=snapshot();refresh();flip(prev);return true;}
     armed[0]=true;dragging=true;down[0]=e.getRawX();down[1]=e.getRawY();to[0]=from;slots.clear();for(int i=0;i<rows.getChildCount();i++){View c=rows.getChildAt(i);if(c.getTag() instanceof Long)slots.add(c);}
     scroll.requestDisallowInterceptTouchEvent(true);row.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);row.setElevation(activity.dp(8));row.setTranslationZ(activity.dp(8));row.animate().scaleX(1.03f).scaleY(1.03f).setDuration(120).start();return true;
    case MotionEvent.ACTION_MOVE:
     if(!armed[0])return true;
     {View first=slots.get(0),last=slots.get(slots.size()-1);float h=row.getHeight();float dy=e.getRawY()-down[1];float min=first.getTop()-row.getTop(),max=last.getTop()-row.getTop();dy=Math.max(min,Math.min(max,dy));row.setTranslationY(dy);
      float center=row.getTop()+dy+h/2;int t=0;for(int k=0;k<slots.size();k++)if(center>slots.get(k).getTop()+slots.get(k).getHeight()/2f)t=k;
      if(t!=to[0]){to[0]=t;for(int k=0;k<slots.size();k++){View c=slots.get(k);if(c==row)continue;float shift=from<t&&k>from&&k<=t?-h:from>t&&k<from&&k>=t?h:0;c.animate().translationY(shift).setDuration(180).setInterpolator(new DecelerateInterpolator(2f)).start();}}}
     return true;
    case MotionEvent.ACTION_UP:case MotionEvent.ACTION_CANCEL:
     if(armed[0]){armed[0]=false;final int target=to[0];View slot=slots.get(target);float settle=slot.getTop()-row.getTop()+(target>from?slot.getHeight()-row.getHeight():0);
      row.animate().translationY(settle).scaleX(1f).scaleY(1f).setDuration(220).setInterpolator(new OvershootInterpolator(1.1f)).withEndAction(()->{dragging=false;if(target!=from){Item moved=items.remove(from);items.add(target,moved);save();}refresh();}).start();}
     return true;
   }
   return false;});
 }
}
