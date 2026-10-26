package com.xiaoxiao.pet;
import java.util.*;
public class MotionEngineTest {
 static MotionEngine.Body body(float x,float y,float vx,float mass){MotionEngine.Body b=new MotionEngine.Body();b.x=x;b.y=y;b.vx=vx;b.mass=mass;b.left=b.top=0;b.right=b.bottom=100;b.awake=vx!=0;return b;}
 static void near(float a,float b,float eps,String name){if(Math.abs(a-b)>eps)throw new AssertionError(name+": "+a+" vs "+b);}
 static void require(boolean ok,String name){if(!ok)throw new AssertionError(name);}
 public static void main(String[] args){
  MotionEngine.Body a=body(100,100,600,1),b=body(199,100,0,1);MotionEngine.contact(a,b,true);near(a.vx,66,.01f,"first velocity");near(b.vx,534,.01f,"transferred velocity");near(a.vx+b.vx,600,.01f,"momentum");float energy=a.vx*a.vx+b.vx*b.vx;require(energy<600*600,"no energy creation");
  a=body(100,100,-200,1);b=body(199,100,200,1);MotionEngine.contact(a,b,true);near(a.vx,-200,0,"separating a");near(b.vx,200,0,"separating b");
  a=body(100,100,600,4);b=body(199,100,0,1);MotionEngine.contact(a,b,true);near(4*a.vx+b.vx,2400,.05f,"mass-weighted momentum");
  a=body(100,100,0,1);b=body(190,100,0,1);a.held=true;a.vx=500;float heldX=a.x;MotionEngine.contact(a,b,true);near(a.x,heldX,0,"held body fixed");require(b.vx>0,"held drag pushes neighbor");require(!b.gravity,"pushed placed body does not fall");
  a=body(-500,-500,0,1);a.left=200;a.top=150;a.right=400;a.bottom=450;MotionEngine.bounds(a,1080,2400);near(a.x,-200,0,"left edge uses visible body");near(a.y,-150,0,"top edge uses visible body");a.x=2000;a.y=3000;MotionEngine.bounds(a,1080,2400);near(a.x,680,0,"right edge");near(a.y,1950,0,"bottom edge");
  a=body(200,300,0,1);List<MotionEngine.Body> one=Arrays.asList(a);for(int i=0;i<240;i++)MotionEngine.step(one,1f/120,1080,2400,true);near(a.y,300,0,"placed body stays");
  a=body(400,100,2000,1);a.vy=0;a.gravity=a.awake=true;float previousVx=a.vx;boolean bounced=false;for(int i=0;i<300;i++){MotionEngine.step(Arrays.asList(a),1f/120,1080,2400,true);if(previousVx>0&&a.vx<0)bounced=true;previousVx=a.vx;require(Float.isFinite(a.x)&&Float.isFinite(a.y),"finite trajectory");require(a.x>=0&&a.x<=980&&a.y>=0&&a.y<=2300,"screen constraints");}require(bounced,"fast throw bounces off side");
  System.out.println("PASS momentum, separation, held drag, screen edges, placement, throw bounce");
 }
}
