package com.xiaoxiao.pet;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.graphics.Rect;
import android.os.Build;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;

/** A compact, scrollable surface placed once, on the clearer side of its pet. */
final class CompactPanel {
    static Dialog create(Context context) {
        Dialog dialog = new Dialog(context, Apple.dialogTheme());
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setCanceledOnTouchOutside(false);
        UiMotion.window(dialog.getWindow());
        return dialog;
    }

    static void show(Dialog dialog, Context context, PetService.Pet pet, String title) {
        show(dialog, context, pet, title, false);
    }

    static void show(Dialog dialog, Context context, PetService.Pet pet, String title, boolean keyboardAware) {
        show(dialog, context, pet, title, keyboardAware, false);
    }

    static void showComposer(Dialog dialog, Context context, PetService.Pet pet, String title) {
        show(dialog, context, pet, title, false, true);
    }

    private static void show(Dialog dialog, Context context, PetService.Pet pet, String title,
                             boolean keyboardAware, boolean composerOnly) {
        Window window = dialog.getWindow();
        boolean overlay = !(context instanceof Activity);
        if (overlay) window.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY);
        window.setTitle(title);
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        Rect usable = new Rect(0, 0, context.getResources().getDisplayMetrics().widthPixels,
                context.getResources().getDisplayMetrics().heightPixels);
        if (Build.VERSION.SDK_INT >= 30) {
            android.view.WindowMetrics metrics = context.getSystemService(WindowManager.class).getMaximumWindowMetrics();
            android.graphics.Insets insets = metrics.getWindowInsets().getInsetsIgnoringVisibility(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            usable = new Rect(metrics.getBounds());
            usable.set(usable.left + insets.left, usable.top + insets.top,
                    usable.right - insets.right, usable.bottom - insets.bottom);
        }
        int margin = Apple.dp(context, 12);
        int width = Math.min(Apple.dp(context, 360), usable.width() - 2 * margin);
        int height = Math.min(usable.height() - 2 * margin,
                Math.min(Apple.dp(context, 300), Math.max(Apple.dp(context, 220), Math.round(usable.height() * .36f))));
        boolean above = overlay && pet != null && pet.frame != null
                && pet.lp.y - usable.top > usable.bottom - (pet.lp.y + pet.lp.height);
        dialog.show();
        Apple.dialog(dialog);
        window.setTitle(title);
        window.setLayout(width, composerOnly ? WindowManager.LayoutParams.WRAP_CONTENT : height);
        WindowManager.LayoutParams attributes = window.getAttributes();
        attributes.gravity = (above ? Gravity.TOP : Gravity.BOTTOM) | Gravity.CENTER_HORIZONTAL;
        attributes.y = margin;
        if (overlay) {
            // Keep the actual character bright and allow touching outside the panel.
            attributes.flags &= ~WindowManager.LayoutParams.FLAG_DIM_BEHIND;
            attributes.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL;
        }
        window.setAttributes(attributes);
        if (keyboardAware) {
            final Rect screen = new Rect(usable);
            final int[] applied = {height};
            window.getDecorView().getViewTreeObserver().addOnGlobalLayoutListener(() -> {
                if (!dialog.isShowing()) return;
                Rect visible = new Rect();
                window.getDecorView().getWindowVisibleDisplayFrame(visible);
                WindowInsets insets = window.getDecorView().getRootWindowInsets();
                boolean typing = Build.VERSION.SDK_INT >= 30
                        ? insets != null && insets.isVisible(WindowInsets.Type.ime())
                        : visible.width() >= screen.width() && screen.bottom - visible.bottom > Apple.dp(context, 120);
                int available = visible.width() >= screen.width()
                        ? Math.max(1, Math.min(screen.bottom, visible.bottom) - screen.top) : screen.height();
                int next = typing ? Math.min(height, Math.min(available - 2 * margin, Apple.dp(context, 180))) : height;
                if (next > 0 && applied[0] != next) {
                    applied[0] = next;
                    window.setLayout(width, next);
                }
            });
        }
        Data.log(pet == null ? "app" : pet.role, "紧凑面板 " + title + " size=" + width + "x" + (composerOnly ? "wrap" : height)
                + " side=" + (above ? "top" : "bottom"));
    }
}
