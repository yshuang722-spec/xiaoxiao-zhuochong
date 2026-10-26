package com.xiaoxiao.pet;

import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationChannelGroup;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Iterator;

/** Read-only permission indicators. Changes are always made in Android Settings. */
final class PermissionsPanel {
    private static final int OVERLAY = 0, NOTIFICATIONS = 1, BATTERY = 2;
    private static final ArrayList<WeakReference<PermissionRow>> rows = new ArrayList<>();

    static void show(MainActivity activity) {
        LinearLayout content = new LinearLayout(activity);
        content.setOrientation(LinearLayout.VERTICAL);
        int padding = Apple.dp(activity, 18);
        content.setPadding(padding, Apple.dp(activity, 8), padding, padding);
        TextView help = Apple.label(activity, "开关显示当前状态，点按后前往系统设置。", 13, false);
        help.setTextColor(Apple.SECONDARY);
        help.setPadding(0, 0, 0, Apple.dp(activity, 12));
        content.addView(help);
        for (int kind : new int[]{OVERLAY, NOTIFICATIONS, BATTERY}) {
            PermissionRow row = new PermissionRow(activity, kind);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
            params.bottomMargin = Apple.dp(activity, 10);
            content.addView(row, params);
        }
        ScrollView scroll = new SpringScrollView(activity);
        scroll.addView(content);
        AlertDialog dialog = new Apple.Builder(activity).setTitle("手机权限")
                .setView(scroll).setNegativeButton("完成", null).show();
        dialog.setOnDismissListener(d -> refresh());
    }

    static View hint(Context context) {
        return new PermissionRow(context, OVERLAY);
    }

    /** Called when returning from Settings, without trusting a requested toggle state. */
    static void refresh() {
        Iterator<WeakReference<PermissionRow>> iterator = rows.iterator();
        while (iterator.hasNext()) {
            PermissionRow row = iterator.next().get();
            if (row == null) iterator.remove();
            else row.refreshState();
        }
    }

    private static boolean appNotificationsAllowed(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        return manager != null && manager.areNotificationsEnabled()
                && (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(
                "android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED);
    }

    private static boolean channelAllowed(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return false;
        NotificationChannel channel = manager.getNotificationChannel("pets");
        // The service creates this channel on first launch; absence is not a denial.
        if (channel == null) return true;
        if (channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        if (Build.VERSION.SDK_INT >= 28 && channel.getGroup() != null) {
            NotificationChannelGroup group = manager.getNotificationChannelGroup(channel.getGroup());
            if (group != null && group.isBlocked()) return false;
        }
        return true;
    }

    private static boolean allowed(Context context, int kind) {
        if (kind == OVERLAY) return Settings.canDrawOverlays(context);
        if (kind == NOTIFICATIONS) return appNotificationsAllowed(context) && channelAllowed(context);
        PowerManager manager = context.getSystemService(PowerManager.class);
        return manager != null && manager.isIgnoringBatteryOptimizations(context.getPackageName());
    }

    private static void open(Context context, int kind) {
        Intent intent;
        if (kind == OVERLAY) {
            intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + context.getPackageName()));
        } else if (kind == NOTIFICATIONS) {
            // A disabled channel needs its own page even when the app-level switch is on.
            boolean channelOnly = appNotificationsAllowed(context) && !channelAllowed(context);
            intent = new Intent(channelOnly ? Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS
                    : Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
            if (channelOnly) intent.putExtra(Settings.EXTRA_CHANNEL_ID, "pets");
        } else {
            // This system list can both grant and revoke the exemption. No direct grant request.
            intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        }
        if (launch(context, intent)) return;
        if (launch(context, new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + context.getPackageName())))) return;
        Toast.makeText(context, "未能打开系统设置，请在手机设置中找到小小桌宠。", Toast.LENGTH_LONG).show();
    }

    private static boolean launch(Context context, Intent intent) {
        try {
            if (!(context instanceof android.app.Activity)) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (android.content.ActivityNotFoundException | SecurityException e) {
            return false;
        }
    }

    private static final class PermissionRow extends SwitchRow {
        final int kind;
        PermissionRow(Context context, int kind) {
            super(context,kind==OVERLAY?"悬浮显示":kind==NOTIFICATIONS?"运行通知":"不受电池优化限制","");
            this.kind=kind;
            View.OnClickListener go = v -> {
                // Switch toggles itself before onClick: immediately restore the actual system state.
                refreshState();
                open(getContext(), this.kind);
            };
            setOnClickListener(go);
            toggle.setOnClickListener(go);
            refreshState();
            rows.add(new WeakReference<>(this));
        }

        void refreshState() {
            Context context = getContext();
            boolean on = allowed(context, kind);
            toggle.setChecked(on);
            title.setTextColor(Apple.INK);
            detail.setTextColor(Apple.SECONDARY);
            setBackground(Apple.shape(context, Apple.BACK, 12));
            String status;
            if (kind == OVERLAY) {
                status = on ? "已允许 · 可在其他应用上显示角色" : "未允许 · 开启后角色才能出现在桌面";
            } else if (kind == NOTIFICATIONS) {
                status = !appNotificationsAllowed(context) ? "应用通知未开启" : !channelAllowed(context)
                        ? "桌宠运行通知未开启" : "已开启 · 可从通知进入角色管理";
            } else {
                status = on ? "已豁免 · 不受系统电池优化限制" : "未豁免 · 在系统列表中找到小小桌宠进行调整";
            }
            detail.setText(status);
            toggle.setContentDescription(title.getText() + "，" + (on ? "已开启" : "未开启") + "，点按打开系统设置");
        }
    }
}
