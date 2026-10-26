package com.xiaoxiao.pet;

import android.app.Dialog;
import android.content.Context;
import android.view.*;

/** Full client workspace. Pet-side overlays keep using CompactPanel. */
final class ClientPage {
    static Dialog create(Context context) {
        Dialog dialog = new Dialog(context, Apple.dialogTheme());
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setCanceledOnTouchOutside(false);
        UiMotion.window(dialog.getWindow());
        return dialog;
    }
    static void show(Dialog dialog, String title) {
        Window window = dialog.getWindow();
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
                | WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
        dialog.show();
        Apple.dialog(dialog);
        window.setTitle(title);
        window.setBackgroundDrawable(Apple.shape(dialog.getContext(), Apple.PANEL, 0));
        window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
        window.setLayout(-1, -1);
        window.setGravity(Gravity.FILL);
        FrostedPanel.configure(dialog,0,true);
        window.setStatusBarColor(Apple.BACK);
        window.setNavigationBarColor(Apple.BACK);
        window.getDecorView().setSystemUiVisibility(Apple.dark ? 0
                : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    }
}
