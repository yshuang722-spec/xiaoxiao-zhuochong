package com.xiaoxiao.pet;

import java.util.List;

/** Small, allocation-free motion solver; velocities are pixels per second. */
final class MotionEngine {
 static final float RESTITUTION=.78f, SLOP=.6f;
 static final class Body {
  float x,y,vx,vy,left,top,right,bottom,mass=1,targetX,targetY;
  boolean held,awake,gravity,contact;
  float invMass(){return held?0:1/Math.max(1,mass);}
 }
 static boolean step(List<Body> bodies,float elapsed,int width,int height,boolean collisions){
  float dt=Math.max(0,Math.min(.05f,elapsed));
  int steps=Math.max(1,(int)Math.ceil(dt*120));
  for(Body b:bodies){b.contact=false;if(b.held){float travel=(float)Math.hypot(b.targetX-b.x,b.targetY-b.y);steps=Math.max(steps,Math.min(24,(int)Math.ceil(travel/Math.max(10,(b.right-b.left)*.3f))));}}
  float h=dt/steps;
  for(int sub=0;sub<steps;sub++){
   for(Body b:bodies){
    if(b.held){int remaining=steps-sub;b.x+=(b.targetX-b.x)/remaining;b.y+=(b.targetY-b.y)/remaining;}
    else if(b.awake){if(b.gravity)b.vy+=1100*h;else{float damping=(float)Math.exp(-3.8f*h);b.vx*=damping;b.vy*=damping;}b.x+=b.vx*h;b.y+=b.vy*h;}
    bounds(b,width,height);
   }
   if(collisions)for(int pass=0;pass<4;pass++)for(int i=0;i<bodies.size();i++)for(int j=i+1;j<bodies.size();j++)contact(bodies.get(i),bodies.get(j),pass==0);
   for(Body b:bodies)bounds(b,width,height);
  }
  boolean active=false;
  for(Body b:bodies){if(!b.held&&b.awake&&!b.gravity&&Math.abs(b.vx)+Math.abs(b.vy)<12){b.awake=false;b.vx=b.vy=0;}active|=b.awake||b.held;}
  return active;
 }
 static void bounds(Body b,int width,int height){
  float minX=-b.left,maxX=width-b.right,minY=-b.top,maxY=height-b.bottom;
  if(maxX<minX)maxX=minX;if(maxY<minY)maxY=minY;
  if(b.x<minX){b.x=minX;if(b.vx<0)b.vx=-b.vx*.74f;}
  if(b.x>maxX){b.x=maxX;if(b.vx>0)b.vx=-b.vx*.74f;}
  if(b.y<minY){b.y=minY;if(b.vy<0)b.vy=-b.vy*.74f;}
  if(b.y>maxY){b.y=maxY;if(b.vy>0){if(b.vy<45){b.vy=0;b.gravity=false;}else b.vy=-b.vy*.67f;}b.vx*=.94f;}
 }
 static boolean contact(Body a,Body b,boolean velocity){
  float al=a.x+a.left,ar=a.x+a.right,at=a.y+a.top,ab=a.y+a.bottom;
  float bl=b.x+b.left,br=b.x+b.right,bt=b.y+b.top,bb=b.y+b.bottom;
  float px=Math.min(ar,br)-Math.max(al,bl),py=Math.min(ab,bb)-Math.max(at,bt);
  if(px<=0||py<=0)return false;
  float ia=a.invMass(),ib=b.invMass(),sum=ia+ib;if(sum==0)return true;
  float nx=0,ny=0,depth;
  if(px<py){nx=al+ar<=bl+br?1:-1;depth=px;}else{ny=at+ab<=bt+bb?1:-1;depth=py;}
  // Correct penetration independently of velocity. Separating contacts never kick again.
  float correction=Math.max(0,depth-SLOP)*.72f/sum;
  a.x-=nx*correction*ia;a.y-=ny*correction*ia;b.x+=nx*correction*ib;b.y+=ny*correction*ib;
  float relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
  if(velocity&&relative<-2){
   float bounce=relative<-50?RESTITUTION:0;
   float impulse=-(1+bounce)*relative/sum;
   if(!a.held){if(!a.awake)a.gravity=false;a.vx-=impulse*ia*nx;a.vy-=impulse*ia*ny;a.awake=true;}
   if(!b.held){if(!b.awake)b.gravity=false;b.vx+=impulse*ib*nx;b.vy+=impulse*ib*ny;b.awake=true;}
   a.contact=b.contact=true;
  }
  return true;
 }
}
