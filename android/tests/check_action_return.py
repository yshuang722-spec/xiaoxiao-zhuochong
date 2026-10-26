"""Regression for the recorded blue-maid return transition (not all source animations).
Usage: python tests/check_action_return.py VIDEO.mp4 --ffmpeg PATH_TO_FFMPEG
Capture is normalized to 540x1200. Supply sibling JSON with initialWindow in
1080x2400 screen coordinates, or use --window-json. This tracks a bright clothing
marker; it is specific to these blue-maid captures, not a general animation test.
"""
import argparse,json,subprocess
import numpy as np
p=argparse.ArgumentParser();p.add_argument('video');p.add_argument('--ffmpeg',default='ffmpeg');p.add_argument('--start',type=float,default=9.8);p.add_argument('--window-json',type=__import__('pathlib').Path);args=p.parse_args()
metadata=args.window_json or __import__('pathlib').Path(args.video).with_suffix('.json')
rect=json.loads(metadata.read_text(encoding='utf-8'))['initialWindow'];x1,y1,x2,y2=[round(x/2) for x in rect]
raw=subprocess.check_output([args.ffmpeg,'-v','error','-ss',str(args.start),'-i',args.video,'-t','2.2','-vf','fps=30,scale=540:1200','-f','rawvideo','-pix_fmt','rgb24','-'])
frames=np.frombuffer(raw,np.uint8).reshape(-1,1200,540,3);centers=[]
for frame in frames:
 region=frame[y1:y2,x1:x2].astype(float);hi=region.max(2);lo=region.min(2);ys,_=np.where((hi>170)&((hi-lo)/np.maximum(hi,1)<.19))
 if len(ys)<100:raise AssertionError('Character marker missing; check capture position')
 centers.append(float(ys.mean()))
assert len(centers)>3,'Capture too short'
spikes=[abs(centers[i]-(centers[i-1]+centers[i+1])/2) for i in range(1,len(centers)-1)]
print(json.dumps({'maxTransientOffsetRecordingPx':max(spikes),'passed':max(spikes)<=10}))
assert max(spikes)<=10,'One-frame return-position flicker detected'
