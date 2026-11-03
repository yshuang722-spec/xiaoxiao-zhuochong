package com.xiaoxiao.pet;

import android.app.*;import android.os.*;import android.provider.Settings;import android.net.Uri;import android.content.*;import android.graphics.*;import android.graphics.drawable.GradientDrawable;import android.view.*;import android.widget.*;import org.json.*;import java.util.*;

public class MainActivity extends Activity {
 static boolean active;LinearLayout content;Handler handler=new Handler();boolean renderedDark,renderedOverlay;final Map<String,TextView> roleStates=new HashMap<>();final Map<String,Switch> roleToggles=new HashMap<>();
 public void onCreate(Bundle b){Data.init(this);Apple.load();setTheme(Apple.dark?com.xiaoxiao2.pet.mobile.R.style.AppThemeDark:com.xiaoxiao2.pet.mobile.R.style.AppTheme);super.onCreate(b);FrostedPanel.attachMain(this);getWindow().setStatusBarColor(Apple.BACK);getWindow().setNavigationBarColor(Apple.BACK);getWindow().getDecorView().setSystemUiVisibility(Apple.dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);render();if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=0)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},1);if(Settings.canDrawOverlays(this)&&Data.instances().length()>0)send("restore",null);}
 public void onResume(){super.onResume();active=true;refreshAppearance();PermissionsPanel.refresh();if(PetService.instance!=null)PetService.instance.control(true);handler.postDelayed(()->{if(active&&!isFinishing()&&!isDestroyed())refreshRoleStates();},300);if(content!=null)content.post(this::updateCardVideos);}
 public void onDestroy(){FrostedPanel.releaseMain(this);super.onDestroy();}
 public void onPause(){for(CardVideo c:cardVideos)stopCardVideo(c);if(!isChangingConfigurations()){active=false;if(PetService.instance!=null)PetService.instance.control(false);}super.onPause();}
 public void onConfigurationChanged(android.content.res.Configuration config){super.onConfigurationChanged(config);refreshAppearance();}
 void refreshAppearance(){
  Apple.load();
  setTheme(Apple.dark?com.xiaoxiao2.pet.mobile.R.style.AppThemeDark:com.xiaoxiao2.pet.mobile.R.style.AppTheme);
  getWindow().setStatusBarColor(Apple.BACK);getWindow().setNavigationBarColor(Apple.BACK);
  getWindow().getDecorView().setSystemUiVisibility(Apple.dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
  if(content==null||renderedDark!=Apple.dark||renderedOverlay!=Settings.canDrawOverlays(this))render();
 }
 int dp(int n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
 TextView text(String s,int size){return Apple.label(this,s,size,false);}
 LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(1);return l;}
 Button button(LinearLayout parent,String value,View.OnClickListener action){Button b=new Button(this);b.setText(value);Apple.button(b,false);b.setOnClickListener(action);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(46));lp.topMargin=dp(6);lp.bottomMargin=dp(6);parent.addView(b,lp);return b;}

 ScrollView pageScroll;TextView liveChip;boolean syncing;final Map<String,View> roleCards=new HashMap<>();boolean editing;String hopId;FrameLayout root;View toastView;Runnable toastHide;final List<android.animation.Animator> jiggles=new ArrayList<>();
 void render(){
  for(android.animation.Animator a:jiggles)a.cancel();jiggles.clear();releaseCardVideos();
  roleStates.clear();roleToggles.clear();roleCards.clear();renderedDark=Apple.dark;renderedOverlay=Settings.canDrawOverlays(this);
  // Rebuilding the page (after toggling a role etc.) keeps the reader where they were.
  final int keep=pageScroll==null?0:pageScroll.getScrollY();
  ScrollView scroll=new SpringScrollView(this);pageScroll=scroll;scroll.setFillViewport(true);scroll.setClipToPadding(false);scroll.setBackgroundColor(Color.TRANSPARENT);content=column();content.setPadding(dp(20),dp(14),dp(20),dp(110));content.setClipChildren(false);scroll.addView(content);scroll.getViewTreeObserver().addOnScrollChangedListener(this::updateCardVideos);
  root=new FrameLayout(this);root.addView(scroll,new FrameLayout.LayoutParams(-1,-1));toastView=null;setContentView(root);
  if(keep>0)scroll.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener(){public boolean onPreDraw(){scroll.getViewTreeObserver().removeOnPreDrawListener(this);scroll.scrollTo(0,keep);return true;}});
  // Header: app icon sticker + name, Artemis logo sticker, settings pill.
  LinearLayout nav=new LinearLayout(this);nav.setGravity(Gravity.CENTER_VERTICAL);nav.setClipChildren(false);
  ImageView icon=new ImageView(this);icon.setImageResource(com.xiaoxiao2.pet.mobile.R.drawable.app_icon);icon.setScaleType(ImageView.ScaleType.FIT_CENTER);icon.setBackground(Sticker.frame(this,13));icon.setPadding(dp(3),dp(3),dp(3),dp(6));icon.setRotation(-4);nav.addView(icon,new LinearLayout.LayoutParams(dp(44),dp(47)));
  TextView brand=text(getApplicationInfo().loadLabel(getPackageManager()).toString(),22);brand.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));brand.setPadding(dp(12),0,0,0);nav.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
  ImageView logo=new ImageView(this);logo.setImageResource(Apple.dark?com.xiaoxiao2.pet.mobile.R.drawable.artemis_night:com.xiaoxiao2.pet.mobile.R.drawable.artemis_day);logo.setScaleType(ImageView.ScaleType.FIT_CENTER);logo.setBackground(Sticker.logoFrame(this,12));logo.setPadding(dp(3),dp(3),dp(3),dp(6));logo.setRotation(4);logo.setContentDescription("Artemis 阿尔忒弥斯计划标志，点按查看大图");logo.setOnClickListener(v->showLogo(logo));UiMotion.press(logo);
  LinearLayout.LayoutParams logoLayout=new LinearLayout.LayoutParams(dp(44),dp(47));logoLayout.rightMargin=dp(12);nav.addView(logo,logoLayout);
  Button settings=new Button(this);settings.setText("设置");Sticker.pill(settings,false);settings.setOnClickListener(v->settings());nav.addView(settings,new LinearLayout.LayoutParams(-2,dp(40)));content.addView(nav);
  TextView title=text("我的角色",30);title.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));title.setPadding(0,dp(24),0,0);content.addView(title);
  TextView subtitle=text("选择今天陪伴你的角色。",14);subtitle.setTextColor(Apple.SECONDARY);subtitle.setPadding(0,dp(8),0,dp(4));content.addView(subtitle);
  if(!Settings.canDrawOverlays(this))content.addView(PermissionsPanel.hint(this));
  ArrayList<String> ids=Data.orderedIds();int onDesk=0;for(String id:ids)if(showing(id))onDesk++;
  LinearLayout chips=new LinearLayout(this);chips.setPadding(0,dp(14),0,0);chips.addView(Sticker.chip(this,ids.size()+" 位角色",false));TextView live=Sticker.chip(this,onDesk>0?onDesk+" 位在桌面上":"都在休息",onDesk>0);liveChip=live;LinearLayout.LayoutParams gap=new LinearLayout.LayoutParams(-2,-2);gap.leftMargin=dp(8);chips.addView(live,gap);content.addView(chips);
  // Toolbar: show/hide all as a segmented control, edit order as a pill — same as the desktop.
  LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER_VERTICAL);bar.setPadding(0,dp(16),0,dp(4));
  LinearLayout seg=Sticker.segmented(this);Button show=new Button(this),hide=new Button(this);show.setText("全部开启");hide.setText("全部隐藏");Sticker.segment(show,false);Sticker.segment(hide,false);seg.addView(show,new LinearLayout.LayoutParams(-2,dp(36)));seg.addView(hide,new LinearLayout.LayoutParams(-2,dp(36)));bar.addView(seg);
  bar.addView(new View(this),new LinearLayout.LayoutParams(0,1,1));
  Button edit=new Button(this);edit.setText(editing?"完成":"编辑顺序");Sticker.pill(edit,editing);edit.setOnClickListener(v->{editing=!editing;render();});bar.addView(edit,new LinearLayout.LayoutParams(-2,dp(40)));content.addView(bar);
  show.setOnClickListener(v->{ArrayList<String> was=new ArrayList<>();for(String id:ids)if(!showing(id))was.add(id);if(was.isEmpty()){toast("所有角色都已经在桌面上了",null,null);return;}send("showAll",null);handler.postDelayed(()->{updateAllRoles();toast("所有角色已开启","撤销",()->hideRoles(was));},300);});
  hide.setOnClickListener(v->{ArrayList<String> was=new ArrayList<>();for(String id:ids)if(showing(id))was.add(id);if(was.isEmpty()){toast("桌面上已经没有角色了",null,null);return;}send("hideAll",null);handler.postDelayed(()->{updateAllRoles();toast("所有角色已隐藏","撤销",()->{for(String id:was)send("show",id);handler.postDelayed(()->updateAllRoles(),300);});},300);});
  if(editing){TextView hint=text("点卡片上的 ↑ ↓ 调整顺序，调好后点「完成」。",13);hint.setTextColor(Apple.dark?0xffcdbfff:0xff5b44b8);hint.setTypeface(Sticker.medium());hint.setPadding(dp(14),dp(11),dp(14),dp(11));GradientDrawable hb=new GradientDrawable();hb.setCornerRadius(dp(16));hb.setColor(Apple.dark?0xff352a52:0xffefe8ff);hint.setBackground(hb);LinearLayout.LayoutParams hp=new LinearLayout.LayoutParams(-1,-2);hp.topMargin=dp(10);content.addView(hint,hp);}
  int index=0;for(String role:ids)card(role,index++);content.post(this::updateCardVideos);
  TextView footer=text("离开控制页，陪伴继续。\n长按桌面上的角色，可打开动作与对话。",12);footer.setTextColor(Apple.SECONDARY);footer.setGravity(Gravity.CENTER);footer.setLineSpacing(dp(4),1);footer.setPadding(0,dp(26),0,0);content.addView(footer);FrostedPanel.refresh();
 }

 void card(String role,int index){
  int tint=roleColor(role);boolean on=showing(role);
  LinearLayout card=column();card.setPadding(dp(10),dp(10),dp(10),dp(18));card.setBackground(Sticker.sticker(this,tint,26));LinearLayout.LayoutParams margin=new LinearLayout.LayoutParams(-1,-2);margin.topMargin=dp(18);content.addView(card,margin);
  // Portrait stage with the status chip, like the desktop card.
  FrameLayout stage=new FrameLayout(this);stage.setBackground(Sticker.stage(this,tint));
  ImageView portrait=new ImageView(this);// Sharp card art (from the desktop poster) when the package has it; the small portrait is only a fallback.
  Bitmap sharp=null;try{sharp=BitmapFactory.decodeStream(getAssets().open(role+"/card.png"));}catch(Exception ignored){}if(sharp!=null)portrait.setImageBitmap(sharp);else try{Bitmap bitmap=BitmapFactory.decodeStream(getAssets().open(Data.role(role).optString("portrait")));JSONArray bounds=Data.role(role).optJSONObject("bounds").optJSONArray(Data.idle(role));if(bounds!=null){int x=(int)(bitmap.getWidth()*bounds.optDouble(0)),y=(int)(bitmap.getHeight()*bounds.optDouble(1));int width=Math.max(1,(int)(bitmap.getWidth()*bounds.optDouble(2))-x),height=Math.max(1,(int)(bitmap.getHeight()*bounds.optDouble(3))-y);bitmap=Bitmap.createBitmap(bitmap,x,y,Math.min(width,bitmap.getWidth()-x),Math.min(height,bitmap.getHeight()-y));}portrait.setImageBitmap(bitmap);}catch(Exception e){Data.log(role,"头像读取失败");}
  portrait.setScaleType(ImageView.ScaleType.FIT_CENTER);FrameLayout.LayoutParams pp=new FrameLayout.LayoutParams(-1,-1);pp.setMargins(dp(12),dp(16),dp(12),dp(14));stage.addView(portrait,pp);stage.setClipChildren(true);final int stageRadius=dp(20);stage.setOutlineProvider(new ViewOutlineProvider(){public void getOutline(View v,android.graphics.Outline o){o.setRoundRect(0,0,v.getWidth(),v.getHeight(),stageRadius);}});stage.setClipToOutline(true);cardVideos.add(new CardVideo(role,stage,portrait));
  PetService svc=PetService.instance;boolean docked=on&&svc!=null&&svc.pets.get(role)!=null&&svc.pets.get(role).docked;
  TextView state=Sticker.chip(this,on?(docked?"已收起":"在桌面上"):"休息中",on);FrameLayout.LayoutParams sp=new FrameLayout.LayoutParams(-2,-2);sp.setMargins(dp(10),dp(10),0,0);stage.addView(state,sp);roleStates.put(role,state);
  card.addView(stage,new LinearLayout.LayoutParams(-1,dp(170)));
  LinearLayout body=column();body.setPadding(dp(10),dp(14),dp(10),0);
  LinearLayout titleRow=new LinearLayout(this);titleRow.setGravity(Gravity.CENTER_VERTICAL);
  LinearLayout nameBox=column();TextView name=text(Data.name(role),19);name.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));name.setMaxLines(1);name.setEllipsize(android.text.TextUtils.TruncateAt.END);nameBox.addView(name);
  View colorBar=new View(this);GradientDrawable cb=new GradientDrawable();cb.setCornerRadius(dp(5));cb.setColor(tint);colorBar.setBackground(cb);LinearLayout.LayoutParams cbp=new LinearLayout.LayoutParams(dp(24),dp(5));cbp.topMargin=dp(6);nameBox.addView(colorBar,cbp);titleRow.addView(nameBox,new LinearLayout.LayoutParams(0,-2,1));
  if(editing){ArrayList<String> order=Data.orderedIds();int pos=order.indexOf(role);for(int d=-1;d<=1;d+=2){final int delta=d;boolean ok=d<0?pos>0:pos<order.size()-1;Button m=new Button(this);m.setText(d<0?"↑":"↓");m.setContentDescription(Data.name(role)+(d<0?"前移一位":"后移一位"));Sticker.circle(m);m.setEnabled(ok);m.setAlpha(ok?1f:.35f);LinearLayout.LayoutParams cell=new LinearLayout.LayoutParams(dp(38),dp(41));cell.rightMargin=dp(6);titleRow.addView(m,cell);m.setOnClickListener(v->{Data.moveRole(role,delta);render();});}}
  Switch toggle=new Switch(this);toggle.setShowText(false);toggle.setChecked(on);toggle.setContentDescription((on?"隐藏":"显示")+Data.name(role));Sticker.styleSwitch(toggle);toggle.setOnCheckedChangeListener((b,checked)->{if(!syncing)setRole(role,checked);});LinearLayout.LayoutParams tp=new LinearLayout.LayoutParams(-2,dp(44));tp.leftMargin=dp(4);titleRow.addView(toggle,tp);roleToggles.put(role,toggle);
  body.addView(titleRow);
  TextView detail=text(Data.role(role).optJSONObject("files").length()+" 个动作",13);detail.setTextColor(Apple.SECONDARY);detail.setTypeface(Sticker.medium());detail.setPadding(0,dp(10),0,0);body.addView(detail);
  LinearLayout.LayoutParams dl=new LinearLayout.LayoutParams(-1,dp(2));dl.topMargin=dp(14);dl.bottomMargin=dp(12);body.addView(Sticker.dashed(this),dl);
  LinearLayout actions=new LinearLayout(this);String[] labels={"对话","管理"};for(int j=0;j<2;j++){final int item=j;Button b=new Button(this);b.setText(labels[j]);Sticker.chipButton(b);LinearLayout.LayoutParams cell=new LinearLayout.LayoutParams(-2,dp(38));if(j>0)cell.leftMargin=dp(8);actions.addView(b,cell);b.setOnClickListener(v->{if(item==0)Chat.show(this,role,role);else manage(role);});}
  body.addView(actions);card.addView(body);roleCards.put(role,card);
  if(role.equals(hopId)){hopId=null;card.post(()->UiMotion.hop(card));}
  if(editing){android.animation.Animator a=UiMotion.jiggle(card,index);if(a!=null)jiggles.add(a);}
 }
 // Cards loop each role's idle animation (no tap needed). Only cards on screen hold a player;
 // the sharp still stays underneath until the first frame arrives, then fades out.
 static final class CardVideo{final String role;final FrameLayout stage;final ImageView still;AlphaVideo video;CardVideo(String r,FrameLayout s,ImageView i){role=r;stage=s;still=i;}}
 final List<CardVideo> cardVideos=new ArrayList<>();final Rect seen=new Rect();
 void releaseCardVideos(){for(CardVideo c:cardVideos)stopCardVideo(c);cardVideos.clear();}
 void stopCardVideo(CardVideo c){if(c.video==null)return;AlphaVideo v=c.video;c.video=null;v.release();c.stage.removeView(v);c.still.animate().cancel();c.still.setAlpha(1f);}
 void updateCardVideos(){if(!active)return;for(CardVideo c:cardVideos){boolean visible=c.stage.isAttachedToWindow()&&c.stage.getLocalVisibleRect(seen)&&seen.height()>dp(24);
  if(visible&&c.video==null)startCardVideo(c);else if(!visible&&c.video!=null)stopCardVideo(c);}}
 void startCardVideo(CardVideo c){int W=c.stage.getWidth(),H=c.stage.getHeight();JSONObject all=Data.role(c.role).optJSONObject("bounds");JSONArray b=all==null?null:all.optJSONArray(Data.idle(c.role));if(W==0||H==0||b==null)return;
  float x0=(float)b.optDouble(0),y0=(float)b.optDouble(1),x1=(float)b.optDouble(2,1),y1=(float)b.optDouble(3,1);
  // Same framing as the still: figure fits the padded box and is centred in it.
  float boxW=W-dp(24),boxH=H-dp(30),figH=boxH/1.06f,vh=figH/Math.max(.05f,y1-y0),vw=vh*4f/3f;float figW=(x1-x0)*vw;if(figW*1.06f>boxW){float k=boxW/(figW*1.06f);vh*=k;vw*=k;figH*=k;}
  float tx=W/2f-(x0+x1)/2f*vw,ty=dp(16)+(boxH-figH)/2f-y0*vh;
  // Exact placement: match the character's box in the first idle frame to its box in the still, so the hand-over is invisible.
  JSONArray fig=Data.role(c.role).optJSONArray("cardFig"),first=Data.role(c.role).optJSONArray("idleFirst");android.graphics.drawable.Drawable still=c.still.getDrawable();
  if(fig!=null&&first!=null&&still!=null&&still.getIntrinsicWidth()>0){RectF r=new RectF((float)fig.optDouble(0)*still.getIntrinsicWidth(),(float)fig.optDouble(1)*still.getIntrinsicHeight(),(float)fig.optDouble(2)*still.getIntrinsicWidth(),(float)fig.optDouble(3)*still.getIntrinsicHeight());
   c.still.getImageMatrix().mapRect(r);r.offset(c.still.getLeft()+c.still.getPaddingLeft(),c.still.getTop()+c.still.getPaddingTop());
   float f0=(float)first.optDouble(0),f1=(float)first.optDouble(1),f2=(float)first.optDouble(2),f3=(float)first.optDouble(3);
   if(r.height()>0&&f3>f1){vh=r.height()/(f3-f1);vw=vh*4f/3f;tx=r.centerX()-(f0+f2)/2f*vw;ty=r.bottom-f3*vh;}}
  AlphaVideo v=new AlphaVideo(this,c.role);c.video=v;c.stage.addView(v,1,new FrameLayout.LayoutParams(Math.round(vw),Math.round(vh),Gravity.TOP|Gravity.LEFT));
  v.setTranslationX(tx);v.setTranslationY(ty);
  Runnable[] wait=new Runnable[1];long started=System.currentTimeMillis();wait[0]=()->{if(c.video!=v)return;if(v.haveFrame){c.still.animate().alpha(0f).setDuration(260).start();return;}if(System.currentTimeMillis()-started<4000)handler.postDelayed(wait[0],80);};handler.postDelayed(wait[0],120);}
 void setRole(String role,boolean on){
  if(on){send("show",role);handler.postDelayed(()->{updateRole(role);View c=roleCards.get(role);if(c!=null)UiMotion.hop(c);},250);return;}
  PetService svc=PetService.instance;if(svc!=null&&svc.pets.get(role)!=null){svc.pets.get(role).hide();svc.save();}
  updateRole(role);toast(Data.name(role)+"已隐藏","撤销",()->{send("show",role);handler.postDelayed(()->{updateRole(role);View c=roleCards.get(role);if(c!=null)UiMotion.hop(c);},250);});
 }
 void hideRoles(List<String> ids){PetService svc=PetService.instance;if(svc!=null){for(String id:ids){PetService.Pet p=svc.pets.get(id);if(p!=null)p.hide();}svc.save();}updateAllRoles();toast("已恢复原来的样子",null,null);}
 /** Update one card (switch + status chip) and the counter chip in place; other cards and their animations are untouched. */
 void updateRole(String role){
  boolean on=showing(role);PetService svc=PetService.instance;boolean docked=on&&svc!=null&&svc.pets.get(role)!=null&&svc.pets.get(role).docked;
  TextView old=roleStates.get(role);String label=on?(docked?"已收起":"在桌面上"):"休息中";
  if(old!=null&&!label.equals(old.getText().toString())&&old.getParent() instanceof ViewGroup){ViewGroup parent=(ViewGroup)old.getParent();int at=parent.indexOfChild(old);TextView chip=Sticker.chip(this,label,on);chip.setLayoutParams(old.getLayoutParams());parent.removeViewAt(at);parent.addView(chip,at);roleStates.put(role,chip);}
  Switch toggle=roleToggles.get(role);if(toggle!=null&&toggle.isChecked()!=on){syncing=true;toggle.setChecked(on);syncing=false;}if(toggle!=null)toggle.setContentDescription((on?"隐藏":"显示")+Data.name(role));
  updateLiveChip();
 }
 void updateAllRoles(){for(String role:new ArrayList<>(roleStates.keySet()))updateRole(role);}
 void updateLiveChip(){if(liveChip==null||!(liveChip.getParent() instanceof ViewGroup))return;int onDesk=0;for(String id:Data.orderedIds())if(showing(id))onDesk++;String text=onDesk>0?onDesk+" 位在桌面上":"都在休息";if(text.equals(liveChip.getText().toString()))return;
  ViewGroup parent=(ViewGroup)liveChip.getParent();int at=parent.indexOfChild(liveChip);TextView chip=Sticker.chip(this,text,onDesk>0);chip.setLayoutParams(liveChip.getLayoutParams());parent.removeViewAt(at);parent.addView(chip,at);liveChip=chip;}
 /** Bottom toast with an optional undo, springing up like the desktop one. */
 void toast(String text,String action,Runnable run){
  if(root==null)return;if(toastHide!=null)handler.removeCallbacks(toastHide);if(toastView!=null&&toastView.getParent()!=null)((ViewGroup)toastView.getParent()).removeView(toastView);
  LinearLayout t=new LinearLayout(this);t.setGravity(Gravity.CENTER_VERTICAL);t.setPadding(dp(18),dp(9),dp(9),dp(13));t.setBackground(Sticker.toast(this));
  TextView m=new TextView(this);m.setText(text);m.setTextSize(14);m.setTypeface(Sticker.medium());m.setTextColor(Apple.dark?0xff2b2133:Color.WHITE);t.addView(m);
  if(action!=null){Button u=new Button(this);u.setText(action);u.setAllCaps(false);u.setTextSize(13);u.setTypeface(Typeface.DEFAULT_BOLD);u.setMinWidth(0);u.setMinimumWidth(0);u.setMinHeight(0);u.setMinimumHeight(0);u.setStateListAnimator(null);u.setPadding(dp(14),0,dp(14),0);u.setTextColor(Apple.dark?Apple.PRIMARY_EDGE:0xffffd2b4);GradientDrawable ub=new GradientDrawable();ub.setCornerRadius(dp(12));ub.setColor(Apple.dark?0x1a2b2133:0x26ffffff);u.setBackground(ub);LinearLayout.LayoutParams up=new LinearLayout.LayoutParams(-2,dp(34));up.leftMargin=dp(14);t.addView(u,up);u.setOnClickListener(v->{if(toastHide!=null){handler.removeCallbacks(toastHide);toastHide.run();}run.run();});}
  FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(-2,-2,Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL);p.bottomMargin=dp(30);root.addView(t,p);toastView=t;
  if(UiMotion.enabled()){t.setAlpha(0);t.setTranslationY(dp(30));t.setScaleX(.96f);t.setScaleY(.96f);t.animate().alpha(1).translationY(0).scaleX(1).scaleY(1).setDuration(450).setInterpolator(new android.view.animation.OvershootInterpolator(1.4f)).start();}
  final View shown=t;toastHide=()->{if(toastView==shown)toastView=null;shown.animate().alpha(0).translationY(dp(20)).setDuration(200).withEndAction(()->{if(shown.getParent()!=null)((ViewGroup)shown.getParent()).removeView(shown);}).start();};
  handler.postDelayed(toastHide,action!=null?5000:2400);
 }
 /** Logo grows out of its header sticker into a large view; tapping the empty area shrinks it back. */
 void showLogo(View from){
  if(root==null)return;FrameLayout f=new FrameLayout(this);f.setBackgroundColor(0x803d2b3f);f.setClickable(true);
  FrameLayout big=new FrameLayout(this);big.setBackground(Sticker.logoFrame(this,36));big.setPadding(dp(7),dp(7),dp(7),dp(12));big.setClickable(true);
  ImageView image=new ImageView(this);BitmapFactory.Options raw=new BitmapFactory.Options();raw.inScaled=false;raw.inPreferredConfig=Bitmap.Config.ARGB_8888;
  image.setImageBitmap(BitmapFactory.decodeResource(getResources(),Apple.dark?com.xiaoxiao2.pet.mobile.R.drawable.artemis_night:com.xiaoxiao2.pet.mobile.R.drawable.artemis_day,raw));
  image.setScaleType(ImageView.ScaleType.FIT_CENTER);image.setContentDescription("Artemis 阿尔忒弥斯计划");image.setClipToOutline(true);
  GradientDrawable clip=new GradientDrawable();clip.setCornerRadius(dp(30));clip.setColor(Apple.dark?0xff16113e:Color.WHITE);image.setBackground(clip);big.addView(image,new FrameLayout.LayoutParams(-1,-1));
  int size=Math.min(getResources().getDisplayMetrics().widthPixels-dp(56),dp(420));f.addView(big,new FrameLayout.LayoutParams(size,size+dp(5),Gravity.CENTER));root.addView(f,new FrameLayout.LayoutParams(-1,-1));
  // From/to the header sticker, measured in the overlay's own coordinates.
  java.util.function.Supplier<float[]> origin=()->{int[] a=new int[2],b=new int[2];from.getLocationInWindow(a);big.getLocationInWindow(b);return new float[]{a[0]-b[0]+big.getTranslationX(),a[1]-b[1]+big.getTranslationY(),from.getWidth()/(float)Math.max(1,big.getWidth())};};
  Runnable close=()->{if(f.getTag()!=null)return;f.setTag("closing");if(!UiMotion.enabled()){root.removeView(f);return;}float[] o=origin.get();big.setPivotX(0);big.setPivotY(0);
   big.animate().translationX(o[0]).translationY(o[1]).scaleX(o[2]).scaleY(o[2]).rotation(4).setDuration(340).setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator()).withEndAction(()->root.removeView(f)).start();f.animate().alpha(0).setDuration(340).start();};
  f.setOnClickListener(v->close.run());logoClose=close;
  if(UiMotion.enabled()){f.setAlpha(0);big.setAlpha(0);big.post(()->{float[] o=origin.get();big.setPivotX(0);big.setPivotY(0);big.setTranslationX(o[0]);big.setTranslationY(o[1]);big.setScaleX(o[2]);big.setScaleY(o[2]);big.setRotation(4);big.setAlpha(1);
   big.animate().translationX(0).translationY(0).scaleX(1).scaleY(1).rotation(0).setDuration(480).setInterpolator(new android.view.animation.OvershootInterpolator(1.1f)).start();f.animate().alpha(1).setDuration(260).start();});}
 }
 Runnable logoClose;
 public void onBackPressed(){if(logoClose!=null&&root!=null&&root.getChildCount()>1&&root.getChildAt(root.getChildCount()-1).getTag()==null&&root.getChildAt(root.getChildCount()-1) instanceof FrameLayout&&((FrameLayout)root.getChildAt(root.getChildCount()-1)).getChildCount()==1&&((FrameLayout)root.getChildAt(root.getChildCount()-1)).getChildAt(0) instanceof FrameLayout){logoClose.run();return;}super.onBackPressed();}


 // Each role's sticker colour: the average of the portrait's colourful pixels, cached per role.
 static final java.util.HashMap<String,Integer> roleColors=new java.util.HashMap<>();
 int roleColor(String role){if(true)return Sticker.roleColor(this,role);Integer cached=roleColors.get(role);if(cached!=null)return cached;int color=Apple.PRIMARY;
  try{Bitmap s=Bitmap.createScaledBitmap(BitmapFactory.decodeStream(getAssets().open(Data.role(role).optString("portrait"))),48,36,true);long r=0,g=0,b=0,n=0;
   for(int y=0;y<s.getHeight();y++)for(int x=0;x<s.getWidth();x++){int p=s.getPixel(x,y);if(Color.alpha(p)<200)continue;int R=Color.red(p),G=Color.green(p),B=Color.blue(p),mx=Math.max(R,Math.max(G,B)),mn=Math.min(R,Math.min(G,B));if(mx-mn<60||mx<70)continue;r+=R;g+=G;b+=B;n++;}
   if(n>0)color=Color.rgb((int)(r/n),(int)(g/n),(int)(b/n));}catch(Exception e){}
  roleColors.put(role,color);return color;}
 static int mix(int a,int b,float t){return Color.rgb(Math.round(Color.red(a)*(1-t)+Color.red(b)*t),Math.round(Color.green(a)*(1-t)+Color.green(b)*t),Math.round(Color.blue(a)*(1-t)+Color.blue(b)*t));}
 // A role card is a sticker: white face with a hairline, sitting on a solid edge in the role's colour.
 android.graphics.drawable.Drawable sticker(int tint){GradientDrawable edge=new GradientDrawable();edge.setCornerRadius(dp(24));edge.setColor(Apple.dark?mix(tint,0xff140e19,.45f):mix(tint,Color.WHITE,.55f));
  GradientDrawable face=new GradientDrawable();face.setCornerRadius(dp(24));face.setColor(Apple.PANEL);face.setStroke(Math.max(1,dp(1)),Apple.LINE);
  android.graphics.drawable.LayerDrawable l=new android.graphics.drawable.LayerDrawable(new android.graphics.drawable.Drawable[]{edge,face});int lift=dp(5);l.setLayerInset(0,0,lift,0,0);l.setLayerInset(1,0,0,0,lift);return l;}
 boolean showing(String role){PetService s=PetService.instance;if(s!=null)return s.pets.containsKey(role)&&s.pets.get(role).visible;JSONArray saved=Data.instances();for(int i=0;i<saved.length();i++){JSONObject row=saved.optJSONObject(i);if(row!=null&&role.equals(row.optString("id")))return row.optBoolean("visible");}return false;}
 void refreshRoleStates(){updateAllRoles();}
 void send(String action,String role){if(!Settings.canDrawOverlays(this)){Toast.makeText(this,"请先允许悬浮显示",0).show();return;}Intent i=new Intent(this,PetService.class).setAction(action);if(role!=null)i.putExtra("role",role);startForegroundService(i);}
 void manage(String role){
  if(Settings.canDrawOverlays(this))send("ensure",role);
  handler.postDelayed(()->{
   PetService service=PetService.instance;
   PetService.Pet pet=service==null?null:service.pets.get(role);
   LinearLayout l=column();l.setPadding(dp(16),0,dp(16),dp(16));l.setBackground(Apple.shape(this,Apple.BACK,0));
   LinearLayout profile=GroupedList.group(l);GroupedList.row(profile,"角色资料",v->ProfilePage.show(this,role));
   if(pet!=null&&pet.docked)GroupedList.row(profile,"从边缘恢复",v->pet.restoreDock());
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
  LinearLayout choices=Sticker.segmented(this);LinearLayout.LayoutParams inset=new LinearLayout.LayoutParams(-1,dp(48));inset.setMargins(dp(12),0,dp(12),dp(12));group.addView(choices,inset);
  String[] keys={"system","day","night"},labels={"跟随系统","日间","夜间"};Button[] buttons=new Button[3];
  Runnable update=()->{for(int n=0;n<3;n++){boolean selected=Apple.mode().equals(keys[n]);Button b=buttons[n];Sticker.segment(b,selected);b.setPadding(dp(6),0,dp(6),selected?dp(2):0);b.setSelected(selected);b.setContentDescription(labels[n]+(selected?"，已选择":""));}};
  for(int n=0;n<3;n++){final int index=n;Button b=new Button(this);buttons[n]=b;b.setText(labels[n]);b.setTextSize(13);choices.addView(b,new LinearLayout.LayoutParams(0,-1,1));b.setOnClickListener(v->{boolean wasDark=Apple.dark;View cover=freezeSettings();Data.prefs().edit().putString("appearance.mode",keys[index]).apply();refreshAppearance();PermissionsPanel.refresh();update.run();Data.log("app","外观 "+Apple.modeLabel());if(wasDark==Apple.dark&&cover!=null&&cover.getParent()!=null)((ViewGroup)cover.getParent()).removeView(cover);if(wasDark!=Apple.dark&&settingsDialog!=null&&settingsDialog.isShowing()){android.app.AlertDialog old=settingsDialog;old.getWindow().setWindowAnimations(0);settings(true);View fresh=settingsDialog.getWindow().getDecorView();fresh.post(()->fresh.postOnAnimation(old::dismiss));}});}update.run();
 }
 android.app.AlertDialog settingsDialog;
 void settings(){settings(false);}
 String appName(){return getApplicationInfo().loadLabel(getPackageManager()).toString();}
 String appVersion(){try{return getPackageManager().getPackageInfo(getPackageName(),0).versionName;}catch(Exception e){return "";}}
 // Snapshot of the open settings panel laid over itself, so recolouring never shows a half-switched frame before the redrawn panel replaces it.
 View freezeSettings(){if(settingsDialog==null||!settingsDialog.isShowing())return null;View d=settingsDialog.getWindow().getDecorView();if(!(d instanceof ViewGroup)||d.getWidth()==0||d.getHeight()==0)return null;try{Bitmap snap=Bitmap.createBitmap(d.getWidth(),d.getHeight(),Bitmap.Config.ARGB_8888);d.draw(new Canvas(snap));ImageView cover=new ImageView(this);cover.setImageBitmap(snap);cover.setScaleType(ImageView.ScaleType.FIT_XY);((ViewGroup)d).addView(cover,new FrameLayout.LayoutParams(-1,-1));return cover;}catch(Throwable e){return null;}}
 void settings(boolean instant){
  LinearLayout l=column();l.setPadding(dp(16),0,dp(16),dp(16));l.setBackground(Apple.shape(this,Apple.BACK,0));appearanceSegments(l);
  LinearLayout preferences=GroupedList.group(l);GroupedList.row(preferences,"手机权限",v->PermissionsPanel.show(this));GroupedList.row(preferences,"AI 接口设置",v->Chat.settings(this));GroupedList.row(preferences,"弹动与碰撞",v->motionSettings());
  LinearLayout support=GroupedList.group(l);GroupedList.row(support,"导出运行日志",v->{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/zip").putExtra(Intent.EXTRA_TITLE,appName()+"-运行日志.zip");startActivityForResult(i,20);});GroupedList.row(support,"关于"+appName(),v->new Apple.Builder(this).setTitle("关于"+appName()).setMessage("安卓手机版 "+appVersion()+"\n\n"+Data.orderedIds().size()+" 位伙伴，各有独立的动作与对话。\n\n由阿尔忒弥斯计划🌙制作\n\n原项目：PC2005-cloud/dsh-pet\n透明视频路线参考：OTFiles/dsh-pet-inAndroid").setPositiveButton("完成",null).show());
  ScrollView scroll=new SpringScrollView(this);scroll.addView(l);android.app.AlertDialog d=new Apple.Builder(this,true).setTitle("设置").setView(scroll).setNegativeButton("关闭",null).create();if(instant)d.getWindow().setWindowAnimations(0);d.show();Apple.dialog(d);if(instant)d.getWindow().setWindowAnimations(0);settingsDialog=d;
 }
 protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==20&&result==RESULT_OK&&data!=null)try(java.util.zip.ZipOutputStream out=new java.util.zip.ZipOutputStream(getContentResolver().openOutputStream(data.getData()))){java.io.File logs=new java.io.File(getFilesDir(),"logs");java.io.File[] dirs=logs.listFiles();if(dirs!=null)for(java.io.File dir:dirs){java.io.File[] fs=dir.listFiles();if(fs!=null)for(java.io.File f:fs){if(!f.isFile()||!f.getName().endsWith(".log"))continue;out.putNextEntry(new java.util.zip.ZipEntry(dir.getName()+"/"+f.getName()));try(java.io.FileInputStream in=new java.io.FileInputStream(f)){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);}out.closeEntry();}}Toast.makeText(this,"日志已导出",0).show();}catch(Exception e){Toast.makeText(this,"日志导出失败",0).show();}}
}
