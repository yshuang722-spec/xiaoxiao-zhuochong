package com.xiaoxiao.pet;

import android.app.*;import android.content.*;import android.os.*;import android.graphics.Color;import android.provider.Settings;import android.view.*;import android.widget.*;import android.text.InputType;
import org.json.*;import java.util.*;import java.util.concurrent.*;import java.net.*;import java.io.*;import java.nio.charset.StandardCharsets;import javax.crypto.*;import javax.crypto.spec.GCMParameterSpec;import java.security.KeyStore;import android.security.keystore.*;import android.util.Base64;

final class Chat {
 static final ExecutorService executor=Executors.newFixedThreadPool(2);
 static final Map<String,Dialog> petChats=new HashMap<>();
 static boolean isPetChatOpen(String id){Dialog d=petChats.get(id);return d!=null&&d.isShowing();}
 static void closePet(String id){Dialog d=petChats.get(id);if(d!=null)d.dismiss();}
 static final Set<String> busy=Collections.synchronizedSet(new HashSet<>());
 static javax.crypto.SecretKey key()throws Exception{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias("xiaoxiao-api")){KeyGenerator g=KeyGenerator.getInstance("AES","AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder("xiaoxiao-api",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}return (javax.crypto.SecretKey)ks.getKey("xiaoxiao-api",null);}
 static void secret(String text)throws Exception{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());Data.prefs().edit().putString("api.secret",Base64.encodeToString(c.getIV(),2)+":"+Base64.encodeToString(c.doFinal(text.getBytes(StandardCharsets.UTF_8)),2)).apply();}
 static String secret()throws Exception{String s=Data.prefs().getString("api.secret","");if(s.isEmpty())return "";String[] v=s.split(":");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(v[0],2)));return new String(c.doFinal(Base64.decode(v[1],2)),StandardCharsets.UTF_8);}
 static EditText field(Context c,LinearLayout parent,String hint,String text,boolean password){EditText e=new EditText(c);e.setText(text);e.setHint(hint);e.setTextSize(15);e.setTextColor(Apple.INK);e.setHintTextColor(Apple.SECONDARY);e.setPadding(Apple.dp(c,14),Apple.dp(c,12),Apple.dp(c,14),Apple.dp(c,12));e.setBackground(Apple.shape(c,Apple.BACK,10));e.setSingleLine(true);if(password)e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);LinearLayout.LayoutParams item=new LinearLayout.LayoutParams(-1,-2);item.topMargin=Apple.dp(c,12);parent.addView(e,item);return e;}
 static void settings(Activity a){
  LinearLayout l=new LinearLayout(a);l.setOrientation(1);int pad=Apple.dp(a,16);l.setPadding(pad,Apple.dp(a,8),pad,Apple.dp(a,12));
  TextView help=Apple.label(a,"各角色共用接口，分别保留人设和聊天记录。填写兼容 OpenAI 格式的 HTTPS 接口。",13,false);help.setTextColor(Apple.SECONDARY);l.addView(help);
  EditText url=field(a,l,"API 地址（例如 https://…/v1）",Data.prefs().getString("api.url",""),false);
  EditText model=field(a,l,"模型名称",Data.prefs().getString("api.model",""),false);
  EditText token=field(a,l,"API Key（留空保留原值）","",true);
  Switch auth=new Switch(a);auth.setTextColor(Apple.INK);auth.setText("使用 api-key 请求头");auth.setPadding(0,Apple.dp(a,12),0,Apple.dp(a,12));
  auth.setChecked(Data.prefs().getBoolean("api.header",Data.prefs().getString("api.url","").contains("xiaomimimo.com")));l.addView(auth);
  TextView status=Apple.label(a,"测试连接会发送一条简短消息，以实际模型回复核验接口。",12,false);status.setTextColor(Apple.SECONDARY);status.setPadding(0,Apple.dp(a,8),0,Apple.dp(a,8));
  Button test=new Button(a);test.setText("测试连接");Apple.button(test,false);l.addView(test,new LinearLayout.LayoutParams(-1,Apple.dp(a,48)));l.addView(status);
  test.setOnClickListener(v->probe(url,model,token,auth,status,test));
  ScrollView scroll=new SpringScrollView(a);scroll.addView(l);
  AlertDialog dialog=new Apple.Builder(a).setTitle("AI 接口设置").setView(scroll).setNegativeButton("取消",null)
   .setNeutralButton("清除 Key",(d,w)->{Data.prefs().edit().remove("api.secret").apply();Data.log("app","AI Key 已清除");})
   .setPositiveButton("保存",null).show();
  dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
   String u=url.getText().toString().trim();
   try{
    if(!u.isEmpty()){if(!"https".equals(new URL(u).getProtocol()))throw new IOException("请填写 HTTPS 地址");selectedSecret(u,token);}
    if(token.length()>0)secret(token.getText().toString().trim());
    Data.prefs().edit().putString("api.url",u).putString("api.model",model.getText().toString().trim()).putBoolean("api.header",auth.isChecked()||u.contains("api.xiaomimimo.com")).apply();
    Data.log("app","AI 设置已调整（不记录 Key）");dialog.dismiss();
   }catch(Exception e){status.setText(e.getMessage()==null?"设置保存失败，请检查填写内容。":e.getMessage());}
  });
 }
 static String selectedSecret(String base,EditText token)throws Exception{
  String previous=Data.prefs().getString("api.url","");
  if(token.length()==0&&!previous.isEmpty()&&!new URL(previous).getAuthority().equalsIgnoreCase(new URL(base).getAuthority()))throw new IOException("更换接口服务商时请重新填写 Key");
  return token.length()>0?token.getText().toString().trim():secret();
 }
 static void probe(EditText url,EditText model,EditText token,Switch auth,TextView status,Button test){
  final String base=url.getText().toString().trim(),selectedModel=model.getText().toString().trim(),apiSecret;final boolean header=auth.isChecked();
  try{
   if(base.isEmpty()||selectedModel.isEmpty())throw new IOException("请先填写 API 地址和模型名称。");
   if(!"https".equals(new URL(base).getProtocol()))throw new IOException("请填写 HTTPS 地址。");
   apiSecret=selectedSecret(base,token);if(apiSecret.isEmpty())throw new IOException("请先填写 API Key，再测试连接。");
  }catch(Exception e){status.setText(e.getMessage()==null?"请检查接口设置。":e.getMessage());return;}
  test.setEnabled(false);status.setText("正在等待模型回复…");long start=SystemClock.elapsedRealtime();
  executor.execute(()->{
   try{
    JSONArray messages=new JSONArray().put(new JSONObject().put("role","user").put("content","请只回复：连接成功。"));
    String answer=request(messages,base,selectedModel,apiSecret,header,48,20000);
    double seconds=(SystemClock.elapsedRealtime()-start)/1000.0;
    String result="连接成功 · "+String.format(java.util.Locale.ROOT,"%.1f",seconds)+" 秒\n模型回复："+(answer.length()>100?answer.substring(0,100)+"…":answer);
    Data.log("app","AI 连接测试成功 durationMs="+(SystemClock.elapsedRealtime()-start));
    new Handler(Looper.getMainLooper()).post(()->status.setText(result));
   }catch(Exception e){
    Data.log("app","AI 连接测试失败："+e.getClass().getSimpleName());
    new Handler(Looper.getMainLooper()).post(()->status.setText("连接失败："+(e.getMessage()==null?"请检查网络和接口设置。":e.getMessage())));
   }finally{new Handler(Looper.getMainLooper()).post(()->test.setEnabled(true));}
  });
 }
 static void show(Context c,String role,String instance){final boolean overlay=!(c instanceof Activity);if(overlay&&isPetChatOpen(instance))return;if(busy.contains(role)){Toast.makeText(c,"该角色正在回复，请稍候",0).show();return;}Dialog dialog=overlay?CompactPanel.create(c):ClientPage.create(c);LinearLayout l=new LinearLayout(c);l.setOrientation(1);l.setPadding(Apple.dp(c,12),Apple.dp(c,8),Apple.dp(c,12),Apple.dp(c,8));LinearLayout top=new LinearLayout(c);top.setGravity(Gravity.CENTER_VERTICAL);TextView title=new TextView(c);title.setText(Data.name(role));title.setTextColor(Apple.INK);title.setTextSize(17);title.setSingleLine(true);title.setEllipsize(android.text.TextUtils.TruncateAt.END);title.setTypeface(android.graphics.Typeface.create("sans-serif-medium",0));top.addView(title,new LinearLayout.LayoutParams(0,-2,1));Button close=new Button(c);close.setText("×");Apple.button(close,false);close.setTextSize(23);top.addView(close,new LinearLayout.LayoutParams(Apple.dp(c,48),Apple.dp(c,48)));close.setOnClickListener(v->dialog.dismiss());l.addView(top);
 TextView text=new TextView(c);text.setTextSize(15);text.setPadding(Apple.dp(c,10),Apple.dp(c,8),Apple.dp(c,10),Apple.dp(c,8));text.setTextColor(Apple.INK);text.setLineSpacing(0f,1f);ScrollView scroll=new SpringScrollView(c);scroll.addView(text);scroll.setBackground(Apple.shape(c,Apple.BACK,14));LinearLayout.LayoutParams transcript=new LinearLayout.LayoutParams(-1,0,1);transcript.topMargin=Apple.dp(c,8);transcript.bottomMargin=Apple.dp(c,8);if(!overlay)l.addView(scroll,transcript);JSONArray history=Data.history(role);if(!overlay)render(text,history);EditText input=new EditText(c);input.setTextColor(Apple.INK);input.setHint("想和她说些什么？");input.setMaxLines(2);input.setMinHeight(Apple.dp(c,48));input.setTextSize(15);input.setHintTextColor(Apple.SECONDARY);input.setPadding(Apple.dp(c,12),Apple.dp(c,12),Apple.dp(c,12),Apple.dp(c,12));input.setBackground(Apple.shape(c,Apple.BACK,12));LinearLayout composer=new LinearLayout(c);composer.setGravity(Gravity.CENTER_VERTICAL);LinearLayout.LayoutParams inputCell=new LinearLayout.LayoutParams(0,-2,1);inputCell.rightMargin=Apple.dp(c,8);composer.addView(input,inputCell);Button send=new Button(c);send.setText("发送");Apple.button(send,true);composer.addView(send,new LinearLayout.LayoutParams(Apple.dp(c,68),Apple.dp(c,48)));if(overlay)composer.setPadding(0,Apple.dp(c,8),0,0);l.addView(composer);TextView status=Apple.label(c,"",12,false);status.setTextColor(Apple.SECONDARY);status.setMaxLines(2);status.setLineSpacing(0f,1f);status.setVisibility(View.GONE);status.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int count,int after){}public void onTextChanged(CharSequence s,int a,int before,int count){status.setVisibility(s.length()==0?View.GONE:View.VISIBLE);}public void afterTextChanged(android.text.Editable s){}});l.addView(status);
 dialog.setContentView(l);PetService.Pet owner=PetService.instance==null?null:PetService.instance.pets.get(instance);if(overlay){petChats.put(instance,dialog);dialog.setOnDismissListener(d->{if(petChats.get(instance)==dialog)petChats.remove(instance);if(owner!=null)owner.clearBubble();});CompactPanel.showComposer(dialog,c,owner,"小小桌宠-角色对话/"+instance);if(owner!=null&&owner.visible)owner.reply("在下方输入消息，我会在这里回复。聊天记录可在客户端查看。");}else{ClientPage.show(dialog,"小小桌宠-客户端对话/"+role);scroll.post(()->scroll.fullScroll(View.FOCUS_DOWN));}

 send.setOnClickListener(v->{String message=input.getText().toString().trim();if(message.isEmpty()||message.length()>8000)return;try{if(Data.prefs().getString("api.url","").isEmpty()||Data.prefs().getString("api.model","").isEmpty()||secret().isEmpty()){status.setText("请先在控制页右上角的设置中填写 AI 接口。");return;}}catch(Exception e){status.setText("API Key 读取失败，请重新保存。");return;}if(!busy.add(role))return;send.setEnabled(false);input.setText("");status.setText(overlay?"你："+message:"正在回复…");send.setText("回复中");if(overlay&&owner!=null)owner.thinking();if(PetService.instance!=null)PetService.instance.talking(instance);executor.execute(()->{try{JSONArray h=Data.history(role);JSONArray messages=new JSONArray();messages.put(new JSONObject().put("role","system").put("content",Data.chatPrompt(role)));for(int i=Math.max(0,h.length()-20);i<h.length();i++)messages.put(h.get(i));messages.put(new JSONObject().put("role","user").put("content",message));String answer=request(messages);h.put(new JSONObject().put("role","user").put("content",message));h.put(new JSONObject().put("role","assistant").put("content",answer));Data.history(role,h);Data.log(role,"对话完成");new Handler(Looper.getMainLooper()).post(()->{if(!overlay)render(text,h);status.setText(overlay?"你："+message:"");if(PetService.instance!=null)PetService.instance.reply(instance,answer);if(!overlay)scroll.post(()->scroll.fullScroll(View.FOCUS_DOWN));});}catch(Exception e){Data.log(role,"对话失败："+e.getClass().getSimpleName());new Handler(Looper.getMainLooper()).post(()->{if(overlay&&owner!=null)owner.clearBubble();status.setText(e.getMessage()==null?"请求失败，请检查网络和接口设置。":e.getMessage());input.setText(message);});}finally{busy.remove(role);new Handler(Looper.getMainLooper()).post(()->{send.setEnabled(true);send.setText("发送");});}});});
 }
 static String displayText(String value){return value.replace("\r\n","\n").replace('\r','\n').replaceAll("\n(?:[\\t ]*\n)+","\n").trim();}
 static void render(TextView v,JSONArray h){StringBuilder s=new StringBuilder();for(int i=0;i<h.length();i++){JSONObject m=h.optJSONObject(i);if(m==null)continue;if(s.length()>0)s.append('\n');s.append("user".equals(m.optString("role"))?"你：":"她：").append(displayText(m.optString("content")));}v.setText(s.length()==0?"可以连续聊天，右上角 × 结束对话。":s.toString());}

 static String request(JSONArray messages)throws Exception{return request(messages,Data.prefs().getString("api.url",""),Data.prefs().getString("api.model",""),secret(),Data.prefs().getBoolean("api.header",false),600,60000);}
 static String request(JSONArray messages,String configuredBase,String selectedModel,String apiSecret,boolean apiKeyHeader,int tokenLimit,int timeout)throws Exception{String base=configuredBase.replaceAll("/+$","");URL url=new URL(base.endsWith("/chat/completions")?base:base+"/chat/completions");if(!"https".equals(url.getProtocol()))throw new IOException("接口必须使用 HTTPS");HttpURLConnection con=(HttpURLConnection)url.openConnection();try{con.setInstanceFollowRedirects(false);con.setConnectTimeout(15000);con.setReadTimeout(timeout);con.setRequestMethod("POST");con.setDoOutput(true);con.setRequestProperty("Content-Type","application/json");if(apiKeyHeader||"api.xiaomimimo.com".equals(url.getHost()))con.setRequestProperty("api-key",apiSecret);else con.setRequestProperty("Authorization","Bearer "+apiSecret);JSONObject payload=new JSONObject().put("model",selectedModel).put("messages",messages).put("stream",false).put("max_tokens",tokenLimit);if("api.xiaomimimo.com".equals(url.getHost()))payload.put("thinking",new JSONObject().put("type","disabled"));byte[] body=payload.toString().getBytes(StandardCharsets.UTF_8);try(OutputStream out=con.getOutputStream()){out.write(body);}int code=con.getResponseCode();if(code<200||code>=300)throw new IOException("接口返回 HTTP "+code+"，请检查地址、模型、Key 或额度。");String data=Data.read(con.getInputStream());String answer=new JSONObject(data).getJSONArray("choices").getJSONObject(0).getJSONObject("message").optString("content","");if(answer.trim().isEmpty())throw new IOException("接口没有返回文本回复");return answer;}finally{con.disconnect();}}
}
