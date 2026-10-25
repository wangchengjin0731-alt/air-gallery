import { GestureRecognizer, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const $ = (id) => document.getElementById(id);
const video = $("webcam");
const overlay = $("handOverlay");
const overlayCtx = overlay.getContext("2d");
const artCanvas = $("artCanvas");
const ctx = artCanvas.getContext("2d");
const cameraFrame = $("cameraFrame");
const placeholder = $("cameraPlaceholder");
const startCameraButton = $("startCamera");
const cameraStatus = $("cameraStatus");
const toast = $("toast");

const artworks = [
  { title: "Soft Geometry No. 01", detailTitle: "Soft Geometry\nNo. 01", artist: "STUDIO AIR / 2026", number: "001", description: "对体积、张力与留白的安静探索。作品会随着观众的动作改变角度，每一次移动都揭示不同的形态。", palette: ["#c7f24f", "#8d9272", "#33333b"], mode: "orb" },
  { title: "Tension Study No. 02", detailTitle: "Tension Study\nNo. 02", artist: "STUDIO AIR / 2026", number: "002", description: "以环形结构探索平衡与张力。不同视角带来新的空间关系，形态在秩序与自由之间摆动。", palette: ["#c7f24f", "#b7b0c7", "#28272f"], mode: "rings" },
  { title: "Quiet Matter No. 03", detailTitle: "Quiet Matter\nNo. 03", artist: "STUDIO AIR / 2026", number: "003", description: "一件关于光与物质的数字雕塑。柔和的色彩与缓慢的运动，邀请观众停留片刻。", palette: ["#c7f24f", "#b2c8c6", "#252b2d"], mode: "petals" }
];
let current = 0;
let width = 800, height = 700, dpr = Math.min(window.devicePixelRatio || 1, 2);
let pointer = { x: 0, y: 0, down: false, lastX: 0, moved: false };
let rotation = 0, targetRotation = 0, focus = 0, targetFocus = 0;
let recognizer = null, stream = null, running = false, lastVideoTime = -1, lastSwipeAt = 0, lastPinch = false;
let lastHandX = null, lastHandY = null, smoothedX = .5, smoothedY = .5;
let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}
function setTracking(label, gesture = "NO GESTURE", active = false) {
  $("trackingLabel").textContent = label;
  $("gestureLabel").textContent = gesture;
  $("trackingDot").classList.toggle("off", !active);
  cameraStatus.classList.toggle("is-active", active);
  cameraStatus.querySelector("span").textContent = active ? "CAMERA ACTIVE" : "GESTURE MODE";
}
function resizeArt() {
  const r = artCanvas.getBoundingClientRect();
  width = Math.max(1, r.width); height = Math.max(1, r.height);
  artCanvas.width = Math.round(width * dpr); artCanvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  overlay.width = Math.max(1, Math.round(overlay.clientWidth * dpr));
  overlay.height = Math.max(1, Math.round(overlay.clientHeight * dpr));
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeArt);
new ResizeObserver(resizeArt).observe(artCanvas);
resizeArt();

function drawArt(t = 0) {
  const w = width, h = height, cx = w * .5, cy = h * .46;
  rotation += (targetRotation - rotation) * .08;
  focus += (targetFocus - focus) * .08;
  ctx.clearRect(0, 0, w, h);
  const art = artworks[current], s = Math.min(w, h) * (.27 + focus * .035);
  const grad = ctx.createRadialGradient(cx - s*.25, cy - s*.35, s*.03, cx, cy, s*1.55);
  grad.addColorStop(0, art.palette[1] + "aa");
  grad.addColorStop(.45, art.palette[2]);
  grad.addColorStop(1, "#0d0d10");
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * .5);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0,0,s*1.28,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#d8d5dc88"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0,0,s*1.02,s*.98,rotation*.2,0,Math.PI*2); ctx.stroke();
  ctx.rotate(rotation*.3);
  if (art.mode === "orb") {
    for (let i=0;i<5;i++) {
      ctx.save(); ctx.rotate(i*Math.PI/5 + Math.sin(t*.0004)*.1);
      ctx.strokeStyle = i===0 ? art.palette[0] : "#e6e2eb88";
      ctx.lineWidth = i===0 ? 1.5 : 1;
      ctx.beginPath(); ctx.ellipse(0,0,s*(.78-i*.085),s*(.37+i*.035),0,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  } else if (art.mode === "rings") {
    for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/8 + Math.sin(t*.0005)*.15);ctx.strokeStyle=i%2? "#f2f0eb88":art.palette[0];ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(0,0,s*(.8-i*.045),s*(.35+i*.04),0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  } else {
    for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*Math.PI/6 + rotation*.2);ctx.fillStyle=i%3===0?art.palette[0]:"#dce1df55";ctx.beginPath();ctx.ellipse(s*.35,0,s*.46,s*.16,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
  const core = ctx.createRadialGradient(-s*.12,-s*.17,1,0,0,s*.35);
  core.addColorStop(0, "#f4ffcf"); core.addColorStop(.22, art.palette[0]); core.addColorStop(1, art.palette[0]+"00");
  ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,s*.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=art.palette[0];ctx.shadowColor=art.palette[0];ctx.shadowBlur=25;
  ctx.beginPath();ctx.arc(0,0,s*(.105+focus*.015),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.restore();
  // subtle orbiting points
  for(let i=0;i<9;i++){const a=t*.00016+i*Math.PI*2/9+rotation*.12;const rr=s*(1.2+Math.sin(t*.0008+i)*.04);ctx.fillStyle=i%3===0?art.palette[0]:"#f2f0eb77";ctx.beginPath();ctx.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.68, i%3===0?2.2:1.2,0,Math.PI*2);ctx.fill();}
  requestAnimationFrame(drawArt);
}
requestAnimationFrame(drawArt);

function updateArtwork() {
  const a=artworks[current];
  $("artNumber").textContent=`0${current+1} / 0${artworks.length}`;
  $("detailNumber").textContent=a.number;
  $("artTitle").textContent=a.title;
  $("artArtist").textContent=a.artist;
  $("detailTitle").innerHTML=a.detailTitle.replace("\n","<br>");
  $("detailDescription").textContent=a.description;
  $("stageHint").innerHTML='<span class="hint-pulse"></span> MOVE YOUR HAND TO INTERACT';
  showToast(`NOW VIEWING / ${a.number}`);
}
function changeArtwork(delta) { current=(current+delta+artworks.length)%artworks.length; targetFocus=0; updateArtwork(); }
$("prevArt").addEventListener("click",()=>changeArtwork(-1));
$("nextArt").addEventListener("click",()=>changeArtwork(1));
$("focusArtwork").addEventListener("click",()=>{targetFocus=targetFocus>.4?0:1;showToast(targetFocus?"FORM FOCUSED":"FOCUS RELEASED");});
artCanvas.addEventListener("pointerdown",e=>{pointer.down=true;pointer.lastX=e.clientX;pointer.moved=false;artCanvas.setPointerCapture?.(e.pointerId);});
artCanvas.addEventListener("pointermove",e=>{
  const r=artCanvas.getBoundingClientRect();pointer.x=(e.clientX-r.left)/r.width;pointer.y=(e.clientY-r.top)/r.height;
  if(pointer.down){const dx=e.clientX-pointer.lastX;if(Math.abs(dx)>1){targetRotation+=dx*.012;pointer.moved=true;}pointer.lastX=e.clientX;}
  else {targetRotation+=(pointer.x-.5)*.001;}
});
artCanvas.addEventListener("pointerup",()=>{pointer.down=false;});
artCanvas.addEventListener("pointercancel",()=>{pointer.down=false;});
artCanvas.addEventListener("wheel",e=>{targetFocus=Math.max(0,Math.min(1,targetFocus+(e.deltaY>0?-.08:.08)));},{passive:true});

async function startCamera() {
  if (running) { stopCamera(); return; }
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("此浏览器不支持摄像头，请使用 HTTPS 或 localhost。"); return;
  }
  startCameraButton.disabled=true;
  startCameraButton.innerHTML="LOADING VISION MODEL…";
  try {
    showToast("正在加载手势识别模型…");
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    recognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task", delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 1
    });
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;
    await video.play();
    running=true;
    cameraFrame.classList.add("has-video");
    startCameraButton.innerHTML="DISABLE CAMERA <span>×</span>";
    placeholder.hidden=true;
    setTracking("识别已启动","SHOW YOUR HAND",true);
    showToast("摄像头已启动：移动手掌旋转作品，左右挥手切换。");
    predictLoop();
  } catch (err) {
    console.error(err);
    const msg = err?.name==="NotAllowedError" ? "摄像头权限未开启，请在浏览器地址栏允许摄像头。" : "启动失败。请检查网络、摄像头权限，并通过 HTTPS 访问。";
    showToast(msg);
    setTracking("摄像头未启动","NO GESTURE",false);
    if (recognizer) { try{recognizer.close();}catch{} recognizer=null; }
    if (stream) stream.getTracks().forEach(t=>t.stop());
    stream=null;
  } finally {
    startCameraButton.disabled=false;
    if(!running) startCameraButton.innerHTML='ENABLE CAMERA <span>↗</span>';
  }
}
function stopCamera() {
  running=false;
  if(stream)stream.getTracks().forEach(t=>t.stop());
  stream=null;video.srcObject=null;
  if(recognizer){try{recognizer.close();}catch{}recognizer=null;}
  cameraFrame.classList.remove("has-video");
  placeholder.hidden=false;
  overlayCtx.clearRect(0,0,overlay.width/dpr,overlay.height/dpr);
  startCameraButton.innerHTML='ENABLE CAMERA <span>↗</span>';
  setTracking("等待启动","NO GESTURE",false);
  showToast("摄像头已关闭。");
}
startCameraButton.addEventListener("click",startCamera);
cameraStatus.addEventListener("click",()=>{document.querySelector("#collection").scrollIntoView({behavior:"smooth"});if(!running)showToast("点击展厅左侧的 ENABLE CAMERA 开启手势识别。");});

function drawHand(landmarks) {
  const w=overlay.clientWidth,h=overlay.clientHeight;
  overlayCtx.clearRect(0,0,w,h);
  if(!landmarks)return;
  const links=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  overlayCtx.strokeStyle="#c7f24f";overlayCtx.lineWidth=1.5;overlayCtx.globalAlpha=.85;
  links.forEach(([a,b])=>{overlayCtx.beginPath();overlayCtx.moveTo((1-landmarks[a].x)*w,landmarks[a].y*h);overlayCtx.lineTo((1-landmarks[b].x)*w,landmarks[b].y*h);overlayCtx.stroke();});
  landmarks.forEach((p,i)=>{overlayCtx.beginPath();overlayCtx.fillStyle=[4,8,12,16,20].includes(i)?"#f2f0eb":"#c7f24f";overlayCtx.arc((1-p.x)*w,p.y*h,[4,8,12,16,20].includes(i)?3:1.8,0,Math.PI*2);overlayCtx.fill();});
  overlayCtx.globalAlpha=1;
}
function predictLoop() {
  if(!running||!recognizer)return;
  if(video.readyState>=2&&video.currentTime!==lastVideoTime){
    lastVideoTime=video.currentTime;
    try {
      const result=recognizer.recognizeForVideo(video,performance.now());
      const landmarks=result.landmarks?.[0];
      drawHand(landmarks);
      if(landmarks) processHand(landmarks,result.gestures?.[0]?.[0]?.categoryName);
      else {setTracking("寻找手部…","NO HAND",true);lastHandX=null;}
    } catch(err){console.warn("Gesture inference:",err);}
  }
  requestAnimationFrame(predictLoop);
}
function processHand(lm,category) {
  // MediaPipe landmark coordinates are normalized to [0, 1].
  const x=lm[9].x,y=lm[9].y;
  smoothedX=smoothedX*.65+x*.35;smoothedY=smoothedY*.65+y*.35;
  targetRotation+=(.5-smoothedX)*.035;
  const thumb=lm[4],index=lm[8];
  const pinchDist=Math.hypot(thumb.x-index.x,thumb.y-index.y);
  const pinching=pinchDist<.055;
  if(pinching&&!lastPinch){targetFocus=targetFocus>.45?0:1;setTracking("已识别手部","PINCH / FOCUS",true);showToast(targetFocus?"作品已聚焦":"已退出聚焦");}
  lastPinch=pinching;
  const now=performance.now();
  if(lastHandX!==null){
    const dx=x-lastHandX;
    if(Math.abs(dx)>.18&&now-lastSwipeAt>1000){
      changeArtwork(dx<0?1:-1);lastSwipeAt=now;
      setTracking("手势已识别",dx<0?"SWIPE LEFT":"SWIPE RIGHT",true);
    } else if(pinching) {
      setTracking("已识别手部","PINCH / FOCUS",true);
    } else {
      setTracking("手部追踪中",category&&category!=="None"?category.toUpperCase():"MOVE / ROTATE",true);
    }
  } else setTracking("手部追踪中",pinching?"PINCH / FOCUS":"MOVE / ROTATE",true);
  lastHandX=x;lastHandY=y;
}
$("menuToggle").addEventListener("click",()=>{$("menuToggle").classList.toggle("active");document.querySelector(".main-nav").classList.toggle("open");});
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>document.querySelector(".main-nav").classList.remove("open")));
updateArtwork();
