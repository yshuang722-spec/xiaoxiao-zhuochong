package com.xiaoxiao.pet;

import android.app.Dialog;
import android.text.InputFilter;
import android.text.InputType;
import android.view.*;
import android.widget.*;

/** User overrides are keyed by the immutable role ID, never by the editable name. */
final class ProfilePage {
    static void show(MainActivity activity, String role) {
        Dialog dialog = ClientPage.create(activity);
        LinearLayout page = new LinearLayout(activity);page.setOrientation(1);
        int pad=Apple.dp(activity,16);page.setPadding(pad,Apple.dp(activity,8),pad,pad);
        LinearLayout header=new LinearLayout(activity);header.setGravity(Gravity.CENTER_VERTICAL);
        TextView title=Apple.label(activity,"角色资料",22,true);
        header.addView(title,new LinearLayout.LayoutParams(0,-2,1));
        Button cancel=new Button(activity);cancel.setText("取消");Apple.button(cancel,false);
        header.addView(cancel,new LinearLayout.LayoutParams(Apple.dp(activity,68),Apple.dp(activity,48)));
        cancel.setOnClickListener(v->dialog.dismiss());page.addView(header);
        ScrollView scroll=new SpringScrollView(activity);scroll.setFillViewport(true);
        LinearLayout form=new LinearLayout(activity);form.setOrientation(1);scroll.addView(form);
        TextView note=Apple.label(activity,"自定义名字和人设，用你喜欢的方式聊天。同角色的分身共用这份资料。",13,false);
        note.setTextColor(Apple.SECONDARY);note.setPadding(0,pad,0,pad);form.addView(note);
        form.addView(Apple.label(activity,"角色名字",15,true));
        EditText name=Chat.field(activity,form,"角色名字",Data.name(role),false);
        name.setContentDescription("角色名字");name.setFilters(new InputFilter[]{new InputFilter.LengthFilter(80)});
        TextView label=Apple.label(activity,"角色人设",15,true);label.setPadding(0,pad,0,0);form.addView(label);
        EditText persona=new EditText(activity);persona.setContentDescription("角色人设");
        persona.setHint("描述角色的性格、说话习惯与关系");persona.setText(Data.persona(role));
        persona.setTextColor(Apple.INK);persona.setHintTextColor(Apple.SECONDARY);persona.setTextSize(15);
        persona.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        persona.setGravity(Gravity.TOP);persona.setMinLines(12);persona.setLineSpacing(0,1);
        persona.setPadding(pad,pad,pad,pad);persona.setBackground(Apple.shape(activity,Apple.BACK,12));
        persona.setFilters(new InputFilter[]{new InputFilter.LengthFilter(16000)});
        LinearLayout.LayoutParams edit=new LinearLayout.LayoutParams(-1,-2);edit.topMargin=Apple.dp(activity,12);form.addView(persona,edit);
        page.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        TextView error=Apple.label(activity,"",13,false);error.setTextColor(Apple.DANGER);error.setVisibility(View.GONE);page.addView(error);
        Button save=new Button(activity);save.setText("保存资料");Apple.button(save,true);
        LinearLayout.LayoutParams footer=new LinearLayout.LayoutParams(-1,Apple.dp(activity,48));footer.topMargin=Apple.dp(activity,12);page.addView(save,footer);
        save.setOnClickListener(v->{try{
            Data.profile(role,name.getText().toString().trim(),persona.getText().toString().trim());
            activity.render();dialog.dismiss();Toast.makeText(activity,"资料已保存，下次发送消息时生效",Toast.LENGTH_SHORT).show();
        }catch(Exception e){error.setText(e.getMessage());error.setVisibility(View.VISIBLE);}});
        dialog.setContentView(page);ClientPage.show(dialog,"小小桌宠-角色资料/"+role);
    }
}
