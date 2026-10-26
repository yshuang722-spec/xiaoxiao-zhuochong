package com.xiaoxiao.pet;

import android.app.*;import android.os.*;import android.provider.Settings;import android.net.Uri;import android.content.*;import android.graphics.*;import android.graphics.drawable.GradientDrawable;import android.view.*;import android.widget.*;import org.json.*;import java.util.*;

public class MainActivity extends Activity {
 static boolean active;LinearLayout content;Handler handler=new Handler();boolean renderedDark,renderedOverlay;final Map<String,TextView> roleStates=new HashMap<>();final Map<String,Button> roleToggles=new HashMap<>();
 public void onCreate(Bundle b){Data.init(this);Apple.load();setTheme(Apple.dark?com.xiaoxiao.pet.mobile.R.style.AppThemeDark:com.xiaoxiao.pet.mobile.R.style.AppTheme);super.onCreate(b);FrostedPanel.attachMain(this);getWindow().setStatusBarColor(Apple.BACK);getWindow().setNavigationBarColor(Apple.BACK);getWindow().getDecorView().setSystemUiVisibility(Apple.dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);render();if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=0)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},1);if(Settings.canDrawOverlays(this)&&Data.instances().length()>0)send("restore",null);}
 public void onResume(){super.onResume();active=true;refreshAppearance();PermissionsPanel.refresh();if(PetService.instance!=null)PetService.instance.control(true);handler.postDelayed(()->{if(active&&!isFinishing()&&!isDestroyed())refreshRoleStates();},300);}
 public void onDestroy(){FrostedPanel.releaseMain(this);super.onDestroy();}
 public void onPause(){if(!isChangingConfigurations()){active=false;if(PetService.instance!=null)PetService.instance.control(false);}super.onPause();}
 public void onConfigurationChanged(android.content.res.Configuration config){super.onConfigurationChanged(config);refreshAppearance();}
 void refreshAppearance(){
  Apple.load();
  setTheme(Apple.dark?com.xiaoxiao.pet.mobile.R.style.AppThemeDark:com.xiaoxiao.pet.mobile.R.style.AppTheme);
  getWindow().setStatusBarColor(Apple.BACK);getWindow().setNavigationBarColor(Apple.BACK);
  getWindow().getDecorView().setSystemUiVisibility(Apple.dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
  if(content==null||renderedDark!=Apple.dark||renderedOverlay!=Settings.canDrawOverlays(this))render();
 }
 int dp(int n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
 TextView text(String s,int size){return Apple.label(this,s,size,false);}
 LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(1);return l;}
 Button button(LinearLayout parent,String value,View.OnClickListener action){Button b=new Button(this);b.setText(value);Apple.button(b,false);b.setOnClickListener(action);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(46));lp.topMargin=dp(6);lp.bottomMargin=dp(6);parent.addView(b,lp);return b;}

 void render(){
  roleStates.clear();roleToggles.clear();renderedDark=Apple.dark;renderedOverlay=Settings.canDrawOverlays(this);
  ScrollView scroll=new SpringScrollView(this);scroll.setFillViewport(true);scroll.setClipToPadding(false);scroll.setBackgroundColor(Color.TRANSPARENT);content=column();content.setPadding(dp(20),dp(14),dp(20),dp(28));scroll.addView(content);setContentView(scroll);
  LinearLayout nav=new LinearLayout(this);nav.setGravity(Gravity.CENTER_VERTICAL);TextView brand=text("小小桌宠",30);brand.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));nav.addView(brand,new LinearLayout.LayoutParams(0,dp(48),1));ImageButton logo=new ImageButton(this);logo.setPadding(0,0,0,0);logo.setImageResource(Apple.dark?com.xiaoxiao.pet.mobile.R.drawable.artemis_night:com.xiaoxiao.pet.mobile.R.drawable.artemis_day);logo.setScaleType(ImageView.ScaleType.FIT_CENTER);logo.setContentDescription("Artemis 标志 · "+(Apple.dark?"夜间模式，点按切换到日间模式":"日间模式，点按切换到夜间模式"));logo.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(0x240065dc),Apple.shape(this,Apple.PANEL,10),null));logo.setOnClickListener(v->toggleAppearance());UiMotion.press(logo);logo.setClipToOutline(true);LinearLayout.LayoutParams logoLayout=new LinearLayout.LayoutParams(dp(42),dp(42));logoLayout.rightMargin=dp(10);nav.addView(logo,logoLayout);Button settings=new Button(this);settings.setText("设置");Apple.button(settings,false);settings.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(0x180065dc),Apple.shape(this,Apple.PANEL,16),null));nav.addView(settings,new LinearLayout.LayoutParams(dp(68),dp(42)));settings.setOnClickListener(v->settings());content.addView(nav);
  TextView subtitle=text("喜欢的伙伴，随时在身边。",15);subtitle.setTextColor(Apple.dark?Apple.SECONDARY:Apple.INK);subtitle.setPadding(0,dp(8),0,dp(22));content.addView(subtitle);
  if(!Settings.canDrawOverlays(this))content.addView(PermissionsPanel.hint(this));
  LinearLayout all=new LinearLayout(this);Button show=new Button(this);show.setText("全部开启");Apple.button(show,true);LinearLayout.LayoutParams left=new LinearLayout.LayoutParams(0,dp(48),1);left.rightMargin=dp(6);all.addView(show,left);show.setOnClickListener(v->{send("showAll",null);handler.postDelayed(()->render(),250);});Button hide=new Button(this);hide.setText("全部隐藏");Apple.button(hide,false);LinearLayout.LayoutParams right=new LinearLayout.LayoutParams(0,dp(48),1);right.leftMargin=dp(6);all.addView(hide,right);hide.setOnClickListener(v->{send("hideAll",null);handler.postDelayed(()->render(),250);});content.addView(all);
  TextView heading=text("我的伙伴",19);heading.setTypeface(Typeface.create("sans-serif-medium",0));heading.setPadding(dp(2),dp(26),0,dp(2));content.addView(heading);for(String role:Data.roles.keySet())card(role);
  TextView footer=text("离开控制页，陪伴继续。\n长按角色，可打开动作与对话。",12);footer.setTextColor(Apple.dark?Apple.SECONDARY:Apple.INK);footer.setGravity(Gravity.CENTER);footer.setLineSpacing(dp(4),1);footer.setPadding(0,dp(24),0,0);content.addView(footer);FrostedPanel.refresh();
 }

 void card(String role){
  LinearLayout card=column();card.setPadding(dp(16),dp(14),dp(16),dp(14));card.setBackground(Apple.shape(this,Apple.PANEL,20));LinearLayout.LayoutParams margin=new LinearLayout.LayoutParams(-1,-2);margin.topMargin=dp(12);content.addView(card,margin);
  LinearLayout row=new LinearLayout(this);row.setGravity(Gravity.CENTER_VERTICAL);ImageView portrait=new ImageView(this);try{Bitmap bitmap=BitmapFactory.decodeStream(getAssets().open(Data.role(role).optString("portrait")));JSONArray bounds=Data.role(role).optJSONObject("bounds").optJSONArray(Data.idle(role));if(bounds!=null){int x=(int)(bitmap.getWidth()*bounds.optDouble(0)),y=(int)(bitmap.getHeight()*bounds.optDouble(1));int width=Math.max(1,(int)(bitmap.getWidth()*bounds.optDouble(2))-x),height=Math.max(1,(int)(bitmap.getHeight()*bounds.optDouble(3))-y);bitmap=Bitmap.createBitmap(bitmap,x,y,Math.min(width,bitmap.getWidth()-x),Math.min(height,bitmap.getHeight()-y));}portrait.setImageBitmap(bitmap);}catch(Exception e){Data.log(role,"头像读取失败");}portrait.setScaleType(ImageView.ScaleType.FIT_CENTER);LinearLayout.LayoutParams image=new LinearLayout.LayoutParams(dp(68),dp(82));image.rightMargin=dp(16);row.addView(portrait,image);
  LinearLayout copy=column();TextView name=text(Data.name(role),18);name.setTypeface(Typeface.create("sans-serif-medium",0));name.setMaxLines(2);name.setEllipsize(android.text.TextUtils.TruncateAt.END);copy.addView(name);TextView detail=text(Data.role(role).optJSONObject("files").length()+" 个动作",13);detail.setTextColor(Apple.SECONDARY);detail.setPadding(0,dp(8),0,0);copy.addView(detail);row.addView(copy,new LinearLayout.LayoutParams(0,-2,1));TextView state=text(showing(role)?"陪伴中":"未开启",11);state.setTextColor(showing(role)?Apple.SUCCESS:Apple.SECONDARY);state.setPadding(dp(8),dp(5),dp(8),dp(5));state.setBackground(Apple.shape(this,showing(role)?Apple.SUCCESS_BACK:Apple.BACK,7));row.addView(state);roleStates.put(role,state);card.addView(row);
  LinearLayout controls=new LinearLayout(this);controls.setPadding(0,dp(12),0,0);String[] labels={showing(role)?"隐藏":"显示","对话","管理"};for(int j=0;j<3;j++){final int index=j;Button b=new Button(this);b.setText(labels[j]);Apple.button(b,index==0&&!showing(role));LinearLayout.LayoutParams cell=new LinearLayout.LayoutParams(0,dp(42),1);if(j>0)cell.leftMargin=dp(8);controls.addView(b,cell);if(index==0)roleToggles.put(role,b);b.setOnClickListener(v->{if(index==0){if(showing(role)){PetService svc=PetService.instance;if(svc!=null){svc.pets.get(role).hide();svc.save();}render();}else{send("show",role);handler.postDelayed(()->render(),200);}}if(index==1)Chat.show(this,role,role);if(index==2)manage(role);});}card.addView(controls);
 }

 boolean showing(String role){PetService s=PetService.instance;if(s!=null)return s.pets.containsKey(role)&&s.pets.get(role).visible;JSONArray saved=Data.instances();for(int i=0;i<saved.length();i++){JSONObject row=saved.optJSONObject(i);if(row!=null&&role.equals(row.optString("id")))return row.optBoolean("visible");}return false;}
 void refreshRoleStates(){for(String role:roleStates.keySet()){boolean on=showing(role);TextView state=roleStates.get(role);String label=on?"陪伴中":"未开启";if(!label.equals(state.getText().toString())){state.setText(label);state.setTextColor(on?Apple.SUCCESS:Apple.SECONDARY);state.setBackground(Apple.shape(this,on?Apple.SUCCESS_BACK:Apple.BACK,7));Button b=roleToggles.get(role);if(b!=null){b.setText(on?"隐藏":"显示");Apple.button(b,!on);}}}}
 void send(String action,String role){if(!Settings.canDrawOverlays(this)){Toast.makeText(this,"请先允许悬浮显示",0).show();return;}Intent i=new Intent(this,PetService.class).setAction(action);if(role!=null)i.putExtra("role",role);startForegroundService(i);}
 void manage(String role){
  if(Settings.canDrawOverlays(this))send("ensure",role);
  handler.postDelayed(()->{
   PetService service=PetService.instance;
   PetService.Pet pet=service==null?null:service.pets.get(role);
   LinearLayout l=column();l.setPadding(dp(16),0,dp(16),dp(16));l.setBackground(Apple.shape(this,Apple.BACK,0));
   LinearLayout profile=GroupedList.group(l);GroupedList.row(profile,"角色资料",v->ProfilePage.show(this,role));
   GroupedList.row(profile,"调整角色大小",v->size(pet)).setEnabled(pet!=null);
   GroupedList.row(profile,"添加分身（最多8个）",v->{service.cloneRole(role);Toast.makeText(this,"已处理，可在分身管理查看",0).show();}).setEnabled(pet!=null);
   GroupedList.row(profile,"分身管理",v->clones(role)).setEnabled(pet!=null);
   LinearLayout playback=GroupedList.group(l);
   Switch rotation=GroupedList.toggle(playback,"自动轮播小动作",pet!=null&&pet.rotation,(b,on)->{if(pet!=null){pet.rotation=on;service.save();}});rotation.setEnabled(pet!=null);
   LinearLayout danger=GroupedList.group(l);
   Button clear=GroupedList.row(danger,"清空该角色聊天记录",v->new Apple.Builder(this).setMessage("清空此角色的手机聊天记录？").setNegativeButton("取消",null).setPositiveButton("清空",(d,w)->{try{Data.history(role,new JSONArray());}catch(Exception e){Toast.makeText(this,"清空失败",0).show();}}).show());clear.setTextColor(Apple.DANGER);clear.setCompoundDrawables(null,null,null,null);
   ScrollView scroll=new SpringScrollView(this);scroll.addView(l);
   new Apple.Builder(this).setTitle(Data.name(role)+" · 管理").setView(scroll).setNegativeButton("关闭",null).show();
  },200);
 }
 void size(PetService.Pet pet){SizePanel.show(this,pet);}
 void clones(String role){if(PetService.instance!=null)new ClonePanel(this,role).show();}
 void toggleAppearance(){Data.prefs().edit().putString("appearance.mode",Apple.dark?"day":"night").apply();refreshAppearance();UiMotion.enter(content);PermissionsPanel.refresh();Data.log("app","Logo 切换外观 "+Apple.modeLabel());Toast.makeText(this,"已切换为"+Apple.modeLabel(),Toast.LENGTH_SHORT).show();}
 void motionSettings(){
  LinearLayout l=column();l.setPadding(dp(18),dp(8),dp(18),dp(18));
  String[] keys={"physics","collision"},labels={"快速甩动时弹动","角色互相碰撞"},details={"慢拖可放置，快速甩动后弹跳。","相遇时互相弹开，避免重叠。"};
  for(int n=0;n<2;n++){final int index=n;SwitchRow row=new SwitchRow(this,labels[n],"");
   Runnable status=()->{boolean on=row.toggle.isChecked();row.detail.setText((on?"已开启 · ":"已关闭 · ")+details[index]);row.toggle.setContentDescription(labels[index]+(on?"，已开启":"，已关闭"));};
   row.toggle.setChecked(Data.prefs().getBoolean(keys[n],true));status.run();row.toggle.setOnCheckedChangeListener((v,on)->{Data.prefs().edit().putBoolean(keys[index],on).apply();status.run();Data.log("app","设置 "+keys[index]+"="+on);});row.setOnClickListener(v->row.toggle.toggle());LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.bottomMargin=dp(10);l.addView(row,lp);
  }
  ScrollView scroll=new SpringScrollView(this);scroll.addView(l);new Apple.Builder(this,true).setTitle("弹动与碰撞").setView(scroll).setPositiveButton("完成",null).show();
 }
 void appearanceSegments(LinearLayout parent){
  LinearLayout group=GroupedList.group(parent);TextView heading=text("外观",15);heading.setPadding(dp(16),dp(14),dp(16),dp(10));group.addView(heading);
  LinearLayout choices=new LinearLayout(this);choices.setPadding(dp(4),dp(4),dp(4),dp(4));choices.setBackground(null);LinearLayout.LayoutParams inset=new LinearLayout.LayoutParams(-1,dp(56));inset.setMargins(dp(12),0,dp(12),dp(12));group.addView(choices,inset);
  String[] keys={"system","day","night"},labels={"跟随系统","日间","夜间"};Button[] buttons=new Button[3];
  Runnable update=()->{for(int n=0;n<3;n++){boolean selected=Apple.mode().equals(keys[n]);Button b=buttons[n];Apple.button(b,false);b.setTextSize(13);b.setPadding(dp(6),0,dp(6),0);b.setSelected(selected);b.setTextColor(selected?Apple.INK:Apple.SECONDARY);b.setBackground(selected?Apple.shape(this,Apple.TINT,10):null);b.setContentDescription(labels[n]+(selected?"，已选择":""));}};
  for(int n=0;n<3;n++){final int index=n;Button b=new Button(this);buttons[n]=b;b.setText(labels[n]);b.setTextSize(13);choices.addView(b,new LinearLayout.LayoutParams(0,-1,1));b.setOnClickListener(v->{Data.prefs().edit().putString("appearance.mode",keys[index]).apply();refreshAppearance();PermissionsPanel.refresh();update.run();Data.log("app","外观 "+Apple.modeLabel());});}update.run();
 }
 void settings(){
  LinearLayout l=column();l.setPadding(dp(16),0,dp(16),dp(16));l.setBackground(Apple.shape(this,Apple.BACK,0));appearanceSegments(l);
  LinearLayout material=GroupedList.group(l);GroupedList.toggle(material,"毛玻璃效果",FrostedPanel.enabled(),(v,on)->{Data.prefs().edit().putBoolean("appearance.glass",on).apply();FrostedPanel.refresh();});
  LinearLayout preferences=GroupedList.group(l);GroupedList.row(preferences,"手机权限",v->PermissionsPanel.show(this));GroupedList.row(preferences,"AI 接口设置",v->Chat.settings(this));GroupedList.row(preferences,"弹动与碰撞",v->motionSettings());
  LinearLayout support=GroupedList.group(l);GroupedList.row(support,"导出运行日志",v->{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/zip").putExtra(Intent.EXTRA_TITLE,"小小桌宠-运行日志.zip");startActivityForResult(i,20);});GroupedList.row(support,"关于小小桌宠",v->new Apple.Builder(this).setTitle("关于小小桌宠").setMessage("手机本地版 0.2.0\n\n五位伙伴，各有独立的动作与对话。\n\n由阿尔忒弥斯计划🌙制作\n\n原项目：PC2005-cloud/dsh-pet\n透明视频路线参考：OTFiles/dsh-pet-inAndroid\n\n自动更新将在后续版本接入。").setPositiveButton("完成",null).show());
  ScrollView scroll=new SpringScrollView(this);scroll.addView(l);new Apple.Builder(this,true).setTitle("设置").setView(scroll).setNegativeButton("关闭",null).show();
 }
 protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==20&&result==RESULT_OK&&data!=null)try(java.util.zip.ZipOutputStream out=new java.util.zip.ZipOutputStream(getContentResolver().openOutputStream(data.getData()))){java.io.File logs=new java.io.File(getFilesDir(),"logs");java.io.File[] dirs=logs.listFiles();if(dirs!=null)for(java.io.File dir:dirs){java.io.File[] fs=dir.listFiles();if(fs!=null)for(java.io.File f:fs){if(!f.isFile()||!f.getName().endsWith(".log"))continue;out.putNextEntry(new java.util.zip.ZipEntry(dir.getName()+"/"+f.getName()));try(java.io.FileInputStream in=new java.io.FileInputStream(f)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);}out.closeEntry();}}Toast.makeText(this,"日志已导出",0).show();}catch(Exception e){Toast.makeText(this,"日志导出失败",0).show();}}
}
