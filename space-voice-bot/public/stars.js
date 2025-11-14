const cnv = document.getElementById("stars");
const ctx = cnv.getContext("2d");
function resize(){ cnv.width = innerWidth; cnv.height = innerHeight; }
resize(); addEventListener("resize", resize);

const N = Math.min(260, Math.floor((cnv.width*cnv.height)/9000));
const stars = Array.from({length:N}, () => ({
  x: Math.random()*cnv.width,
  y: Math.random()*cnv.height,
  r: Math.random()*1.8 + 0.4,
  a: Math.random()*0.6 + 0.3,
  tw: Math.random()*0.01 + 0.004,
  vx: - (Math.random()*0.04 + 0.02),
  vy:   (Math.random()*0.03 + 0.01)
}));

function tick(){
  const g = ctx.createRadialGradient(cnv.width*.5, cnv.height*.6, cnv.height*.12,
                                     cnv.width*.5, cnv.height*.6, Math.max(cnv.width, cnv.height));
  g.addColorStop(0, 'rgba(0,18,40,.65)');
  g.addColorStop(.7,'rgba(0,0,10,.72)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g; ctx.fillRect(0,0,cnv.width,cnv.height);

  for(const s of stars){
    s.x += s.vx; s.y -= s.vy;
    if (s.x < -2 || s.y < -2) { s.x = cnv.width+2; s.y = cnv.height*Math.random(); }
    s.a += (Math.random()-0.5)*s.tw;
    s.a = Math.max(0.25, Math.min(1, s.a));

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.shadowColor = 'rgba(130,210,255,.45)';
    ctx.shadowBlur = 6;
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();
  }
  requestAnimationFrame(tick);
}
tick();
