package com.xiaoxiao.pet;
import android.app.*;import android.widget.*;import android.view.*;import java.util.*;

/** 动作分类：把任意动作加进 转向 / 拖拽 / 点击回应（点一下加入，再点一下移出；每类至少留一个）。改动立即保存并生效（右键/长按菜单与点击回应都读这份分类）。 */
final class GroupsPanel {
 final MainActivity activity;final String role;final LinearLayout body;final TextView status;AlertDialog dialog;
 GroupsPanel(MainActivity a,String role){activity=a;this.role=role;
  LinearLayout content=a.column();content.setPadding(a.dp(16),0,a.dp(16),a.dp(8));
  TextView hint=a.text("把「小动作」等任意动作加进下面的分类：点一下加入，再点一下移出，每类至少保留一个。点击回应分类决定点宠物时播什么；其他分类会出现在宠物的动作菜单里。",12);hint.setTextColor(Apple.SECONDARY);hint.setPadding(a.dp(2),a.dp(8),0,a.dp(4));content.addView(hint);
  ScrollView scroll=new SpringScrollView(a);body=a.column();scroll.addView(body);
  content.addView(scroll,new LinearLayout.LayoutParams(-1,Math.min(a.dp(460),a.getResources().getDisplayMetrics().heightPixels*58/100)));
  status=a.text("",12);status.setTextColor(Apple.SECONDARY);status.setPadding(a.dp(2),a.dp(6),0,0);content.addView(status);
  content.addView(PlaylistPanel.bar(a,new String[]{"恢复默认分类","完成"},new View.OnClickListener[]{v->{Data.resetGroups(role);say("已恢复默认分类");refresh();},v->dialog.dismiss()}));
  dialog=new Apple.Builder(a).setTitle(Data.name(role)+" · 动作分类").setView(content).create();refresh();}
 void show(){dialog.show();Apple.dialog(dialog);}
 void say(String s){status.setText(s);}
 void refresh(){
  body.removeAllViews();ArrayList<String> all=Data.allActions(role);
  for(final String key:Data.editGroups(role)){
   ArrayList<String> now=Data.groupNames(role,key);
   TextView head=Apple.label(activity,key+"（已选 "+now.size()+"）",14,true);head.setPadding(activity.dp(2),activity.dp(14),0,activity.dp(6));body.addView(head);
   ArrayList<Button> cs=new ArrayList<>();
   for(final String name:all){boolean on=now.contains(name);
    Button b=new Button(activity);b.setText((on?"✓ ":"")+name);Sticker.pill(b,on);
    b.setOnClickListener(v->{ArrayList<String> list=Data.groupNames(role,key);if(on){if(list.size()<=1){say("每个分类至少要保留一个动作");return;}list.remove(name);}else list.add(name);Data.setGroup(role,key,list);say("已保存");refresh();});
    cs.add(b);}
   View flow=PlaylistPanel.grid(activity,cs);
   body.addView(flow,new LinearLayout.LayoutParams(-1,-2));}
 }
}
