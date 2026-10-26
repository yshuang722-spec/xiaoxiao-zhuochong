package com.xiaoxiao.pet;

import android.app.*;import android.content.*;import android.view.*;import android.widget.*;

/** Preview without per-frame preference writes; dismissing restores size and position. */
final class SizePanel {
 static final java.util.Map<String,Dialog> active=new java.util.HashMap<>();
 static void close(String id){Dialog d=active.get(id);if(d!=null)d.dismiss();}
 static void show(Context c,PetService.Pet pet){
  if(pet==null||PetService.instance==null||active.containsKey(pet.id))return;
  final int original=pet.width;final float oldX=pet.x,oldY=pet.y;final boolean[] done={false};
  pet.previewWidth=original;pet.previewX=oldX;pet.previewY=oldY;
  Dialog dialog=CompactPanel.create(c);LinearLayout l=new LinearLayout(c);l.setOrientation(1);int pad=Apple.dp(c,16);l.setPadding(pad,pad,pad,pad);
  l.addView(Apple.label(c,"角色大小",19,true));TextView value=Apple.label(c,"",14,false);value.setPadding(0,pad,0,Apple.dp(c,8));l.addView(value);
  int maximum=PetService.instance.sw();SeekBar slider=new SeekBar(c);slider.setContentDescription("角色大小");slider.setMax(Math.max(0,maximum-160));slider.setProgress(original-160);l.addView(slider,new LinearLayout.LayoutParams(-1,Apple.dp(c,48)));
  Runnable update=()->value.setText(Math.round((slider.getProgress()+160)*100f/Math.min(Apple.dp(c,220),maximum*2/3))+"% · "+(slider.getProgress()+160)+" px");update.run();
  slider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar s,int v,boolean user){update.run();if(user)pet.previewSize(v+160);}public void onStartTrackingTouch(SeekBar s){}public void onStopTrackingTouch(SeekBar s){}});
  TextView hint=Apple.label(c,"拖动即时预览，完成后保存。",12,false);hint.setTextColor(Apple.SECONDARY);l.addView(hint);
  LinearLayout buttons=new LinearLayout(c);buttons.setPadding(0,pad,0,0);String[] labels={"取消","默认","完成"};for(int i=0;i<3;i++){final int item=i;Button b=new Button(c);b.setText(labels[i]);Apple.button(b,i==2);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,Apple.dp(c,44),1);if(i>0)p.leftMargin=Apple.dp(c,8);buttons.addView(b,p);b.setOnClickListener(v->{if(item==0)dialog.dismiss();if(item==1){int size=Math.min(Apple.dp(c,220),maximum*2/3);slider.setProgress(size-160);pet.previewSize(size);}if(item==2){done[0]=true;pet.previewWidth=-1;pet.resize(slider.getProgress()+160);dialog.dismiss();}});}l.addView(buttons);dialog.setContentView(l);
  active.put(pet.id,dialog);
  dialog.setOnDismissListener(d->{active.remove(pet.id);pet.previewWidth=-1;if(!done[0]){pet.width=original;pet.x=oldX;pet.y=oldY;pet.update();if(PetService.instance!=null)PetService.instance.requestMotion();}});
  CompactPanel.showComposer(dialog,c,pet,"小小桌宠-大小/"+pet.id);
 }
}
