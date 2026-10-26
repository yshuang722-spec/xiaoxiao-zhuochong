package com.xiaoxiao.pet;

import android.content.*;
import android.util.Log;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

final class Data {
 static Context app;
 static final LinkedHashMap<String,JSONObject> roles=new LinkedHashMap<>();
 static final Random random=new Random();
 static void init(Context c){if(app!=null)return;app=c.getApplicationContext();Apple.load();try{JSONArray a=new JSONArray(read(app.getAssets().open("catalog.json")));for(int i=0;i<a.length();i++){JSONObject r=a.getJSONObject(i);roles.put(r.getString("id"),r);}}catch(Exception e){throw new IllegalStateException("角色目录读取失败",e);}prune();}
 static String read(InputStream in)throws IOException{try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=source.read(b))!=-1)out.write(b,0,n);return out.toString("UTF-8");}}
 static android.content.SharedPreferences prefs(){return app.getSharedPreferences("pet",0);}
 static JSONObject role(String id){return roles.get(id);}
 static String name(String id){return prefs().getString("profile."+id+".name",role(id).optString("name",id));}
 static String persona(String id){return prefs().getString("profile."+id+".prompt",role(id).optString("prompt"));}
 static String chatPrompt(String id){return persona(id)+"\n当前使用的角色名字是："+name(id)+"。以此名字自称。\n当前为连续对话，按内容自然回答，不强制限制为20字。";}
 static void profile(String id,String name,String prompt)throws IOException{
  if(!roles.containsKey(id))throw new IOException("角色不存在");
  if(name.isEmpty()||name.codePointCount(0,name.length())>40||name.matches("(?s).*[\\p{Cntrl}].*"))throw new IOException("名字请填写1–40个字，不能含换行。");
  if(prompt.isEmpty()||prompt.length()>16000)throw new IOException("人设请填写1–16000个字符。");
  if(!prefs().edit().putString("profile."+id+".name",name).putString("profile."+id+".prompt",prompt).commit())throw new IOException("保存失败，请重试。");
  log(id,"角色资料已更新（名字与人设，不记录正文）");
 }
 static String idle(String id){return role(id).optString("idle");}
 static String file(String id,String action){return role(id).optJSONObject("files").optString(action,"");}
 static LinkedHashMap<String,String> menuGroups(String id){LinkedHashMap<String,String> out=new LinkedHashMap<>();JSONObject groups=role(id).optJSONObject("groups");for(Iterator<String> k=groups.keys();k.hasNext();){String key=k.next();JSONArray list=groups.optJSONArray(key);if(list==null||list.length()==0)continue;if(key.startsWith("事件·")){if(key.equals("事件·whisper"))out.put("对话动作",key);}else out.put(key,key);}return out;}
 static String pick(String id,String group){JSONArray a=role(id).optJSONObject("groups").optJSONArray(group);return a==null||a.length()==0?idle(id):a.optString(random.nextInt(a.length()),idle(id));}
 static String talk(String id){JSONObject groups=role(id).optJSONObject("groups");ArrayList<String> found=new ArrayList<>();for(Iterator<String> k=groups.keys();k.hasNext();){JSONArray a=groups.optJSONArray(k.next());if(a!=null)for(int j=0;j<a.length();j++)if(a.optString(j).contains("碎碎念")||a.optString(j).contains("说话"))found.add(a.optString(j));}return found.isEmpty()?pick(id,"点击回应"):found.get(random.nextInt(found.size()));}
 static JSONArray instances(){try{return new JSONArray(prefs().getString("instances","[]"));}catch(Exception e){return new JSONArray();}}
 static void instances(JSONArray a){prefs().edit().putString("instances",a.toString()).apply();}
 static final java.util.concurrent.ExecutorService logWriter=new java.util.concurrent.ThreadPoolExecutor(1,1,0,java.util.concurrent.TimeUnit.MILLISECONDS,new java.util.concurrent.ArrayBlockingQueue<Runnable>(256),r->{Thread t=new Thread(r,"pet-log-writer");t.setDaemon(true);return t;},new java.util.concurrent.ThreadPoolExecutor.DiscardPolicy());
 static void log(String id,String event){logWriter.execute(()->writeLog(id,event));}
 static synchronized void writeLog(String id,String event){try{prune();File dir=new File(app.getFilesDir(),"logs/"+id);dir.mkdirs();String date=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT).format(new Date());File f=new File(dir,date+".log");if(f.length()>1024*1024)return;try(FileOutputStream o=new FileOutputStream(f,true)){o.write((new SimpleDateFormat("HH:mm:ss",Locale.ROOT).format(new Date())+" "+event+"\n").getBytes(StandardCharsets.UTF_8));}Log.i("XiaoPet",id+" "+event);}catch(Exception e){Log.w("XiaoPet","日志写入失败",e);}}
 static long lastPrune;
 static void prune(){long now=System.currentTimeMillis();if(now-lastPrune<3600000)return;lastPrune=now;File root=new File(app.getFilesDir(),"logs");File[] dirs=root.listFiles();if(dirs!=null)for(File d:dirs){File[] files=d.listFiles();if(files!=null)for(File f:files)if(f.getName().endsWith(".log")&&now-f.lastModified()>10L*86400000)f.delete();}}
 static JSONArray history(String role){try{return new JSONArray(read(new FileInputStream(new File(app.getFilesDir(),"chat-"+role+".json"))));}catch(Exception e){return new JSONArray();}}
 static synchronized void history(String role,JSONArray a)throws Exception{JSONArray keep=new JSONArray();for(int i=Math.max(0,a.length()-100);i<a.length();i++)keep.put(a.get(i));File target=new File(app.getFilesDir(),"chat-"+role+".json"),tmp=new File(target+".tmp");try(FileOutputStream o=new FileOutputStream(tmp)){o.write(keep.toString().getBytes(StandardCharsets.UTF_8));o.getFD().sync();}if(!tmp.renameTo(target))throw new IOException("聊天记录保存失败");}
}
