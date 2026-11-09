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
 static boolean keepSizes;
 static void init(Context c){if(app!=null)return;app=c.getApplicationContext();migrateRoleIds();keepSizes=app.getSharedPreferences("pet",0).getBoolean("size700",false);Apple.load();try{JSONArray a=new JSONArray(read(app.getAssets().open("catalog.json")));for(int i=0;i<a.length();i++){JSONObject r=a.getJSONObject(i);roles.put(r.getString("id"),r);baseGroups.put(r.getString("id"),new JSONObject(r.optJSONObject("groups").toString()));}}catch(Exception e){throw new IllegalStateException("角色目录读取失败",e);}applyGroupOverrides();prune();}
 static final String[][] ID_MAP={{"yuyu","character9"},{"rabbit","character8"}};
 static String newId(String s){if(s==null)return s;for(String[] m:ID_MAP){if(s.equals(m[0]))return m[1];if(s.startsWith(m[0]+"#"))return m[1]+s.substring(m[0].length());}return s;}
 static void migrateRoleIds(){SharedPreferences p=prefs();if(p.getInt("roleIdVer",0)>=1)return;try{
  SharedPreferences.Editor e=p.edit();
  JSONArray a=new JSONArray(p.getString("instances","[]"));for(int i=0;i<a.length();i++){JSONObject r=a.optJSONObject(i);if(r==null)continue;for(String k:new String[]{"id","role"})if(r.has(k))r.put(k,newId(r.optString(k)));}e.putString("instances",a.toString());
  JSONArray o=new JSONArray(p.getString("roleOrder","[]")),n=new JSONArray();for(int i=0;i<o.length();i++)n.put(newId(o.optString(i)));e.putString("roleOrder",n.toString());
  HashMap<String,String> puts=new HashMap<>();for(Map.Entry<String,?> en:p.getAll().entrySet()){String k=en.getKey();if(!k.startsWith("profile.")||!(en.getValue() instanceof String))continue;int d=k.lastIndexOf('.');if(d<=8)continue;String id=k.substring(8,d),nk="profile."+newId(id)+k.substring(d);if(!nk.equals(k)){e.remove(k);puts.put(nk,(String)en.getValue());}}
  for(Map.Entry<String,String> en:puts.entrySet())e.putString(en.getKey(),en.getValue());
  File fd=app.getFilesDir();ArrayList<File[]> moves=new ArrayList<>();
  for(String m[]:ID_MAP){File c=new File(fd,"chat-"+m[0]+".json");if(c.exists()){File t=new File(fd,"chat-"+m[0]+".json.mig");c.renameTo(t);moves.add(new File[]{t,new File(fd,"chat-"+m[1]+".json")});}File l=new File(fd,"logs/"+m[0]);if(l.exists()){File t=new File(fd,"logs/"+m[0]+".mig");l.renameTo(t);moves.add(new File[]{t,new File(fd,"logs/"+m[1])});}}
  for(File[] mv:moves)mv[0].renameTo(mv[1]);
  e.putInt("roleIdVer",1);e.commit();}catch(Exception ex){Log.e("pet","角色编号迁移失败",ex);}}
 static String read(InputStream in)throws IOException{try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=source.read(b))!=-1)out.write(b,0,n);return out.toString("UTF-8");}}
 static android.content.SharedPreferences prefs(){return app.getSharedPreferences("pet",0);}
 static JSONObject role(String id){return roles.get(id);}
 static ArrayList<String> orderedIds(){ArrayList<String> out=new ArrayList<>();try{JSONArray a=new JSONArray(prefs().getString("roleOrder","[]"));for(int i=0;i<a.length();i++){String id=a.optString(i);if(roles.containsKey(id)&&!out.contains(id))out.add(id);}}catch(Exception e){}for(String id:roles.keySet())if(!out.contains(id))out.add(id);return out;}
 static void moveRole(String id,int delta){ArrayList<String> o=orderedIds();int i=o.indexOf(id),j=i+delta;if(i<0||j<0||j>=o.size())return;o.remove(i);o.add(j,id);prefs().edit().putString("roleOrder",new JSONArray(o).toString()).apply();}
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
 // 轮播编排：每个角色一份有序动作列表（可重复；空表=不轮播）。没存过就用目录里的「小动作」顺序；读取时按现有动作文件过滤，旧名字自动丢弃
 static ArrayList<String> allActions(String id){LinkedHashSet<String> out=new LinkedHashSet<>();JSONObject groups=role(id).optJSONObject("groups");if(groups!=null)for(Iterator<String> k=groups.keys();k.hasNext();){String key=k.next();if(key.startsWith("事件·"))continue;JSONArray a=groups.optJSONArray(key);if(a!=null)for(int i=0;i<a.length();i++){String n=a.optString(i);if(!n.isEmpty()&&!file(id,n).isEmpty())out.add(n);}}return new ArrayList<>(out);}
 static ArrayList<String> defaultPlaylist(String id){ArrayList<String> out=new ArrayList<>();JSONObject groups=role(id).optJSONObject("groups");JSONArray a=groups==null?null:groups.optJSONArray("小动作");JSONArray ex=role(id).optJSONArray("rotationExclude");if(a!=null)for(int i=0;i<a.length();i++){String n=a.optString(i);boolean skip=false;if(ex!=null)for(int k=0;k<ex.length();k++)if(n.equals(ex.optString(k)))skip=true;if(!n.isEmpty()&&!skip&&!file(id,n).isEmpty())out.add(n);}return out;}
 // 动作分类：用户可把任意动作加进 转向/拖拽/点击回应（存 SharedPreferences "groups.<角色>"，启动时覆盖进角色目录；baseGroups 是原始分类，用于恢复默认）
 static ArrayList<String> editGroups(String id){ArrayList<String> out=new ArrayList<>();JSONObject g=role(id).optJSONObject("groups");if(g!=null)for(Iterator<String> k=g.keys();k.hasNext();){String key=k.next();if(!key.equals("小动作")&&!key.startsWith("事件·"))out.add(key);}return out;}
 static final HashMap<String,JSONObject> baseGroups=new HashMap<>();
 static void applyGroupOverrides(){for(String id:roles.keySet()){String raw=prefs().getString("groups."+id,null);if(raw==null)continue;try{JSONObject o=new JSONObject(raw);JSONObject g=roles.get(id).optJSONObject("groups");for(String k:editGroups(id)){JSONArray a=o.optJSONArray(k);if(a==null)continue;JSONArray ok=new JSONArray();for(int i=0;i<a.length();i++){String n=a.optString(i);if(!n.isEmpty()&&!file(id,n).isEmpty())ok.put(n);}if(ok.length()>0)g.put(k,ok);}}catch(Exception e){}}}
 static ArrayList<String> groupNames(String id,String key){ArrayList<String> out=new ArrayList<>();JSONArray a=role(id).optJSONObject("groups").optJSONArray(key);if(a!=null)for(int i=0;i<a.length();i++)out.add(a.optString(i));return out;}
 static boolean groupsSaved(String id){return prefs().contains("groups."+id);}
 static void setGroup(String id,String key,List<String> list){try{String raw=prefs().getString("groups."+id,null);JSONObject o=raw==null?new JSONObject():new JSONObject(raw);o.put(key,new JSONArray(list));prefs().edit().putString("groups."+id,o.toString()).apply();role(id).optJSONObject("groups").put(key,new JSONArray(list));}catch(Exception e){}}
 static void resetGroups(String id){try{prefs().edit().remove("groups."+id).apply();JSONObject base=baseGroups.get(id);JSONObject g=role(id).optJSONObject("groups");if(base!=null)for(String k:editGroups(id))if(base.has(k))g.put(k,base.getJSONArray(k));}catch(Exception e){}}
 static boolean hasEditGroup(String id,String key){return role(id).optJSONObject("groups").has(key);}
 static boolean playlistSaved(String id){return prefs().contains("playlist."+id);}
 static ArrayList<String> playlist(String id){String raw=prefs().getString("playlist."+id,null);if(raw==null)return defaultPlaylist(id);ArrayList<String> out=new ArrayList<>();try{JSONArray a=new JSONArray(raw);for(int i=0;i<a.length();i++){String n=a.optString(i);if(!n.isEmpty()&&!file(id,n).isEmpty())out.add(n);}}catch(Exception e){return defaultPlaylist(id);}return out;}
 static void playlist(String id,List<String> list){prefs().edit().putString("playlist."+id,new JSONArray(list).toString()).apply();}
 static void resetPlaylist(String id){prefs().edit().remove("playlist."+id).apply();}
 static String file(String id,String action){return role(id).optJSONObject("files").optString(action,"");}
 static LinkedHashMap<String,String> menuGroups(String id){LinkedHashMap<String,String> out=new LinkedHashMap<>();JSONObject groups=role(id).optJSONObject("groups");for(Iterator<String> k=groups.keys();k.hasNext();){String key=k.next();JSONArray list=groups.optJSONArray(key);if(list==null||list.length()==0)continue;if(key.startsWith("事件·")){if(key.equals("事件·whisper"))out.put("对话动作",key);}else out.put(key,key);}return out;}
 static String pickRot(String id,String group){JSONObject r=role(id);JSONArray a=r.optJSONObject("groups").optJSONArray(group);JSONArray ex=r.optJSONArray("rotationExclude");java.util.ArrayList<String> l=new java.util.ArrayList<>();if(a!=null)for(int i=0;i<a.length();i++){String n=a.optString(i);boolean s=false;if(ex!=null)for(int k=0;k<ex.length();k++)if(n.equals(ex.optString(k)))s=true;if(!s)l.add(n);}return l.isEmpty()?idle(id):l.get(random.nextInt(l.size()));}
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
