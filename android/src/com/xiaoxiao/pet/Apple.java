package com.xiaoxiao.pet;

import android.app.*;
import android.content.*;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.*;
import android.graphics.drawable.*;
import android.view.*;
import android.widget.*;
import java.util.ArrayList;
import java.util.WeakHashMap;

/** Shared tokens and weak view bindings; changing appearance never replaces dialog contents. */
final class Apple {
    static boolean dark;
    private static boolean initialized;
    static int BACK, INK, SECONDARY, BLUE, LINE, TINT, PANEL, SUCCESS, SUCCESS_BACK, DANGER;
    static final int PRIMARY = Color.rgb(0, 101, 220);
    private static final WeakHashMap<TextView, Boolean> texts = new WeakHashMap<>();
    private static final WeakHashMap<GradientDrawable, Boolean> shapes = new WeakHashMap<>();
    private static final WeakHashMap<GradientDrawable, Integer> materials = new WeakHashMap<>();
    private static final WeakHashMap<RippleDrawable, Boolean> ripples = new WeakHashMap<>();
    private static final WeakHashMap<Dialog, Boolean> dialogs = new WeakHashMap<>();

    static String mode() {
        if (Data.app == null) return "system";
        String value = Data.prefs().getString("appearance.mode", "");
        if (value.equals("system") || value.equals("day") || value.equals("night")) return value;
        // Retain the old explicit choice, while new installations follow Android.
        if (Data.prefs().contains("appearance.night"))
            return Data.prefs().getBoolean("appearance.night", false) ? "night" : "day";
        return "system";
    }
    static String modeLabel() {
        String value = mode();
        return value.equals("day") ? "日间模式" : value.equals("night") ? "夜间模式" : "跟随系统";
    }
    static boolean load() {
        String value = mode();
        boolean next = value.equals("night") || value.equals("system") && Data.app != null
                && (Data.app.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        if (initialized && dark == next) return false;
        // List rows may have been laid out after dialog.show(); bind them using the old palette.
        for (Dialog dialog : new ArrayList<>(dialogs.keySet()))
            if (dialog != null && dialog.isShowing()) bindDialogText(dialog.getWindow().getDecorView());
        int[] previous = palette();
        boolean wasInitialized = initialized;
        dark = next;
        BACK = dark ? Color.rgb(16,16,20) : Color.rgb(242,242,247);
        PANEL = dark ? Color.rgb(28,28,32) : Color.WHITE;
        INK = dark ? Color.rgb(245,245,247) : Color.rgb(28,28,30);
        SECONDARY = dark ? Color.rgb(200,200,208) : Color.rgb(66,66,72);
        BLUE = dark ? Color.rgb(143,191,255) : PRIMARY;
        LINE = dark ? Color.rgb(58,58,64) : Color.rgb(229,229,234);
        TINT = dark ? Color.rgb(25,48,77) : Color.rgb(235,243,255);
        SUCCESS = dark ? Color.rgb(139,225,173) : Color.rgb(30,120,65);
        SUCCESS_BACK = dark ? Color.rgb(24,58,41) : Color.rgb(232,247,237);
        DANGER = dark ? Color.rgb(255,117,110) : Color.rgb(193,42,40);
        initialized = true;
        if (!wasInitialized) return true;

        for (GradientDrawable shape : new ArrayList<>(shapes.keySet()))
            if (shape != null && shape.getColor() != null)
                shape.setColor(mapped(shape.getColor().getDefaultColor(), previous));
        for (RippleDrawable ripple : new ArrayList<>(ripples.keySet()))
            if (ripple != null) ripple.setColor(ColorStateList.valueOf(
                    Boolean.TRUE.equals(ripples.get(ripple)) ? 0x33ffffff : (BLUE & 0xffffff) | 0x24000000));
        for (TextView text : new ArrayList<>(texts.keySet())) {
            if (text == null) continue;
            text.setTextColor(Boolean.TRUE.equals(texts.get(text)) ? Color.WHITE : mapped(text.getCurrentTextColor(), previous));
            if (text instanceof EditText) {
                text.setHintTextColor(mapped(text.getCurrentHintTextColor(), previous));
                text.setHighlightColor((BLUE & 0xffffff) | 0x44000000);
            }
            tintControl(text);
        }
        for (Dialog dialog : new ArrayList<>(dialogs.keySet())) {
            if (dialog == null) continue;
            if (!dialog.isShowing()) { dialogs.remove(dialog); continue; }
            // New native rows use the new theme; existing text, input and scroll remain intact.
            dialog.getContext().setTheme(dialogTheme());
            tintControls(dialog.getWindow().getDecorView());
            if (dialog instanceof AlertDialog) alertButtons((AlertDialog) dialog);
        }
        FrostedPanel.refresh();
        return true;
    }
    private static int[] palette() { return new int[]{BACK,INK,SECONDARY,BLUE,LINE,TINT,PANEL,SUCCESS,SUCCESS_BACK,DANGER}; }
    private static int mapped(int color, int[] previous) {
        int[] current = palette();
        for (int i=0; i<previous.length; i++) if (color == previous[i]) return current[i];
        return color;
    }
    private static boolean paletteColor(int color) {
        for (int token : palette()) if (color == token) return true;
        return false;
    }
    static int dialogTheme() { return dark ? com.xiaoxiao.pet.mobile.R.style.GlassDialogDark : com.xiaoxiao.pet.mobile.R.style.GlassDialogLight; }
    static int dp(Context c,int value) { return Math.round(c.getResources().getDisplayMetrics().density*value); }
    private static GradientDrawable rawShape(Context c,int color,int radius) {
        GradientDrawable d=color==PANEL||color==BACK?new GlassSurface(c,radius):new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(c,radius)); return d;
    }
    static GradientDrawable shape(Context c,int color,int radius) {
        GradientDrawable d=rawShape(c,color,radius); shapes.put(d,true); if(color==PANEL||color==BACK){materials.put(d,color==PANEL?1:2);material(d);} return d;
    }
    static void material(GradientDrawable d){Integer role=materials.get(d);if(role!=null){int color=role==1?PANEL:BACK;d.setColor(FrostedPanel.available()?FrostedPanel.tint(color,role==1?(dark?76:96):(dark?44:56)):color);if(d instanceof GlassSurface)((GlassSurface)d).glass(FrostedPanel.available());}}
    static void refreshMaterials(){for(GradientDrawable d:new ArrayList<>(materials.keySet()))if(d!=null)material(d);}
    static void button(Button b,boolean primary) {
        Context c=b.getContext(); b.setAllCaps(false); b.setTextSize(15);
        b.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));
        b.setTextColor(primary?Color.WHITE:BLUE); b.setLetterSpacing(0); b.setMinWidth(0); b.setMinimumWidth(0);
        b.setMinHeight(dp(c,44)); b.setPadding(dp(c,12),0,dp(c,12),0); b.setElevation(0); b.setStateListAnimator(null);
        // Saturated primary blue and its white text are constant in both appearances.
        GradientDrawable background=primary?rawShape(c,PRIMARY,12):shape(c,TINT,12);
        RippleDrawable ripple=new RippleDrawable(ColorStateList.valueOf(primary?0x33ffffff:(BLUE&0xffffff)|0x24000000),background,null);
        b.setBackground(ripple); ripples.put(ripple,primary); texts.put(b,primary);
        UiMotion.press(b);
    }
    static TextView label(Context c,String value,int size,boolean bold) {
        TextView t=new TextView(c); t.setText(value); t.setTextColor(INK); t.setTextSize(size);
        t.setTypeface(Typeface.create(bold?"sans-serif-medium":"sans-serif",Typeface.NORMAL));
        t.setIncludeFontPadding(false); texts.put(t,false); return t;
    }
    static void dialog(Dialog d) {
        Window w=d.getWindow(); if(w==null)return;
        if(UiMotion.enabled())w.setWindowAnimations(com.xiaoxiao.pet.mobile.R.style.PanelMotion);
        w.setBackgroundDrawable(shape(d.getContext(),PANEL,24)); w.setDimAmount(.25f);
        w.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND); dialogs.put(d,true);
        bindDialogText(w.getDecorView());
        w.getDecorView().post(()->{if(d.isShowing())bindDialogText(w.getDecorView());});
        if(d instanceof AlertDialog)alertButtons((AlertDialog)d);
        // The whole window, including its glass, transitions via PanelMotion.
        FrostedPanel.attach(d);
    }
    // Only dialog trees are scanned, to bind native labels and inputs not created by label().
    private static void bindDialogText(View view) {
        if(view instanceof TextView) {
            TextView text=(TextView)view;
            if(!texts.containsKey(text)) {
                if(!paletteColor(text.getCurrentTextColor()))text.setTextColor(text instanceof Button?BLUE:INK);
                texts.put(text,false);
                if(text instanceof EditText)text.setHintTextColor(SECONDARY);
            }
        }
        tintControl(view);
        if(view instanceof ViewGroup) {
            ViewGroup group=(ViewGroup)view;
            for(int i=0;i<group.getChildCount();i++)bindDialogText(group.getChildAt(i));
        }
    }
    private static ColorStateList controlColors() {
        return new ColorStateList(new int[][]{new int[]{android.R.attr.state_checked},new int[]{}},new int[]{BLUE,SECONDARY});
    }
    private static void tintControl(View view) {
        if(view instanceof Switch) {
            Switch toggle=(Switch)view; toggle.setThumbTintList(controlColors());
            toggle.setTrackTintList(new ColorStateList(new int[][]{new int[]{android.R.attr.state_checked},new int[]{}},
                    new int[]{dark?0xff355c83:0xffb8d7fa,LINE}));
        } else if(view instanceof CompoundButton)((CompoundButton)view).setButtonTintList(controlColors());
        if(view instanceof CheckedTextView)((CheckedTextView)view).setCheckMarkTintList(controlColors());
        if(view instanceof SeekBar) {
            SeekBar slider=(SeekBar)view; slider.setProgressTintList(ColorStateList.valueOf(BLUE));
            slider.setThumbTintList(ColorStateList.valueOf(BLUE)); slider.setProgressBackgroundTintList(ColorStateList.valueOf(LINE));
        }
    }
    private static void tintControls(View view) {
        tintControl(view);
        if(view instanceof ViewGroup) {
            ViewGroup group=(ViewGroup)view;
            for(int i=0;i<group.getChildCount();i++)tintControls(group.getChildAt(i));
        }
    }
    private static void alertButtons(AlertDialog d) {
        for(int id:new int[]{-1,-2,-3}) {
            Button b=d.getButton(id);
            if(b!=null) { b.setTextColor(BLUE); b.setAllCaps(false); b.setTextSize(15); texts.put(b,false); }
        }
    }
    static class Builder extends AlertDialog.Builder {
        final boolean glass;
        Builder(Context c) { this(c,true); }
        Builder(Context c,boolean glass) { super(c,glass?(dark?com.xiaoxiao.pet.mobile.R.style.GlassDialogDark:com.xiaoxiao.pet.mobile.R.style.GlassDialogLight):dialogTheme());this.glass=glass; }
        public AlertDialog create(){AlertDialog d=super.create();UiMotion.window(d.getWindow());return d;}
        public AlertDialog show() { AlertDialog d=super.show(); dialog(d);return d; }
    }
}
