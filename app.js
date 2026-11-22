const GHM21_PROTOCOL_ADDRESS="0x44F2EB703696D878ef12e7774100a59e273740a5";
const $=id=>document.getElementById(id);
const MAINNET_BSC_USDT="0x55d398326f99059fF775485246999027B3197955";
let ACTIVE_USDT_ADDRESS="0x68c31dF310769594591cfe0A426bBf91E74e1080";
let SAFETY_VAULT_ADDRESS="0xcA6c1C9f67F453F236d50C3f5680DE700706CAFA";
let IS_LIVE_USDT=false;
let RANK_REQS={r1d:2,r1v:200,r2d:3,r2v:500,r3d:5,r3v:1000};
const OPS_WALLET="0xF926618D3Ff9302E5c11E3935FB6aD54Afc65dAD";
const VISIBLE_L2_CAP=5;
const C_PREF=GHM21_PROTOCOL_ADDRESS.slice(0,10).toLowerCase();
const SNAP_KEY="ghm21_snap_"+C_PREF;
const REF_KEY="ghm21_ref_"+C_PREF;
let activeAuditorWallet="0x985cC42B9790CF0AE053e1Be7DA281505219Cc4F";

const DEFAULT_BOT_TOKEN="8447353627:AAEkq0cSW2PIKffOReCfnwVK8RUmMbNFt9c";
const DEFAULT_BOT_USER="GHM21Alertsbot";
const DEFAULT_FB_URL="https://facebook.com/groups/ghm21";
let BOT_TOKEN=DEFAULT_BOT_TOKEN,BOT_USERNAME=DEFAULT_BOT_USER,FB_GROUP_URL=DEFAULT_FB_URL;
let LOH_CHANNEL="@GHM21_loh",AUDITOR_CHANNEL="@GHM21_tasks",MAIN_CHANNEL="@GHM21_CHNL",RECOVERY_CHANNEL="@GHM21_recovery";
let customSocialOverrideRaw="",lastSocialSyncTs=0;

function xorObfuscateToken(str){
  if(!str)return "";
  const key=GHM21_PROTOCOL_ADDRESS.toLowerCase();
  let hex="";
  for(let i=0;i<str.length;i++)hex+=(str.charCodeAt(i)^key.charCodeAt(i%key.length)).toString(16).padStart(2,"0");
  return "x:"+hex;
}
function xorDeobfuscateToken(enc){
  if(!enc)return "";
  if(!enc.startsWith("x:"))return enc;
  const hex=enc.slice(2),key=GHM21_PROTOCOL_ADDRESS.toLowerCase();
  let out="";
  for(let i=0;i+1<hex.length;i+=2){
    const b=parseInt(hex.slice(i,i+2),16);if(Number.isNaN(b))return "";
    out+=String.fromCharCode(b^key.charCodeAt((i/2)%key.length));
  }
  return out;
}
function getTgApiBases(){
  return[`https://api.telegram.org/bot${BOT_TOKEN}`,`https://corsproxy.io/?${encodeURIComponent('https://api.telegram.org/bot'+BOT_TOKEN)}`];
}
function applyNetworkAndSocialLinks(isLiveFlag,uTokAddr){
  let changed=false;
  if(uTokAddr&&uTokAddr!==ethers.ZeroAddress&&uTokAddr.toLowerCase()!==ACTIVE_USDT_ADDRESS.toLowerCase()){
    ACTIVE_USDT_ADDRESS=ethers.getAddress(uTokAddr);
    if(signer)usdt=new ethers.Contract(ACTIVE_USDT_ADDRESS,ERC20_ABI,signer);
    changed=true;
  }
  const liveNow=Boolean(isLiveFlag)||(ACTIVE_USDT_ADDRESS.toLowerCase()===MAINNET_BSC_USDT.toLowerCase());
  if(liveNow!==IS_LIVE_USDT||changed){
    IS_LIVE_USDT=liveNow;
    RANK_REQS=IS_LIVE_USDT?{r1d:5,r1v:2500,r2d:10,r2v:10000,r3d:21,r3v:50000}:{r1d:2,r1v:200,r2d:3,r2v:500,r3d:5,r3v:1000};
    const faqR2=$('faqRankRule');
    if(faqR2)faqR2.innerHTML=`<b>2. Ranks${IS_LIVE_USDT?'':' (Testnet Thresholds Active)'}, 24h Manager Pool & Certificates:</b> <b>Member</b> earns L1 (10%). <b>Guider</b> (${RANK_REQS.r1d} Directs, $${RANK_REQS.r1v.toLocaleString()} Team Vol, 1 Pillar) unlocks L1–L3 (10%, 3%, 1%). <b>Leader</b> (${RANK_REQS.r2d} Directs, $${RANK_REQS.r2v.toLocaleString()} Vol, 2 Pillars) unlocks L1–L6 (+0.8%, 0.6%, 0.5%). <b>Manager</b> (${RANK_REQS.r3d} Directs, $${RANK_REQS.r3v.toLocaleString()} Vol, 3 Pillars) unlocks L1–L9 (+0.4%, 0.4%, 0.3%) & shares equally in the <b>👑 24h Active Manager Pool</b> while running an active PH cycle!`;
  }
  const defMain=IS_LIVE_USDT?"@GHM21M":"@GHM21_CHNL",defLoh=IS_LIVE_USDT?"@GHM21_letters":"@GHM21_loh";
  const parts=(customSocialOverrideRaw||"").split("|");
  const fbRaw=(parts[0]||"").trim(),mainRaw=(parts[1]||"").trim(),lohRaw=(parts[2]||"").trim(),taskRaw=(parts[3]||"").trim(),recRaw=(parts[4]||"").trim(),botURaw=(parts[5]||"").trim().replace(/^@+/,""),botTRaw=(parts[6]||"").trim();
  FB_GROUP_URL=fbRaw||DEFAULT_FB_URL;
  MAIN_CHANNEL=mainRaw?(mainRaw.startsWith("@")||mainRaw.startsWith("-")?mainRaw:"@"+mainRaw):defMain;
  LOH_CHANNEL=lohRaw?(lohRaw.startsWith("@")||lohRaw.startsWith("-")?lohRaw:"@"+lohRaw):defLoh;
  AUDITOR_CHANNEL=taskRaw?(taskRaw.startsWith("@")||taskRaw.startsWith("-")?taskRaw:"@"+taskRaw):"@GHM21_tasks";
  RECOVERY_CHANNEL=recRaw?(recRaw.startsWith("@")||recRaw.startsWith("-")?recRaw:"@"+recRaw):"@GHM21_recovery";
  BOT_USERNAME=botURaw||DEFAULT_BOT_USER;
  BOT_TOKEN=botTRaw?(xorDeobfuscateToken(botTRaw)||DEFAULT_BOT_TOKEN):DEFAULT_BOT_TOKEN;

  const mainClean=MAIN_CHANNEL.replace(/^@+/,""),tgHref=MAIN_CHANNEL.startsWith("http")?MAIN_CHANNEL:`https://t.me/${mainClean}`;
  if($('footTgIco'))$('footTgIco').href=tgHref;
  if($('mobTgLink'))$('mobTgLink').href=tgHref;
  if($('compChnlLink')){$('compChnlLink').href=tgHref;$('compChnlLink').innerText=`📢 Updates in @${mainClean} ↗`}
  if($('dashBotStartLink')){$('dashBotStartLink').href=`https://t.me/${BOT_USERNAME}?start=connect`;$('dashBotStartLink').innerText=`1. Start @${BOT_USERNAME} ↗`}
  const hideFb=(FB_GROUP_URL.toLowerCase()==="off"||FB_GROUP_URL.toLowerCase()==="none");
  const fbHref=FB_GROUP_URL.startsWith("http")?FB_GROUP_URL:`https://${FB_GROUP_URL}`;
  if($('footFbIco')){$('footFbIco').style.display=hideFb?'none':'inline-flex';if(!hideFb)$('footFbIco').href=fbHref}
  if($('mobFbLink')){$('mobFbLink').style.display=hideFb?'none':'block';if(!hideFb)$('mobFbLink').href=fbHref}
}

const RPCS=["https://bsc-dataseed.bnbchain.org","https://bsc-rpc.publicnode.com","https://bsc-dataseed1.defibit.io","https://bsc-dataseed1.ninicoin.io","https://bsc-dataseed2.bnbchain.org","https://bsc-dataseed3.bnbchain.org"];
const STATIC_NET=ethers.Network.from(56);
let rpcIdx=0,rpcPool=[],rProv=null,lastRaceTs=0;
function getRpcAt(i){
  if(rpcPool.length===0)rpcPool=RPCS.map(u=>new ethers.JsonRpcProvider(u,STATIC_NET,{staticNetwork:STATIC_NET}));
  return rpcPool[(rpcIdx+i)%rpcPool.length];
}
const nodeMemCache=new Map(),taskSubMemCache=new Map();
function setBoundedCache(key,val){
  if(nodeMemCache.size>=300&&!nodeMemCache.has(key)){const oldest=nodeMemCache.keys().next().value;if(oldest!==undefined)nodeMemCache.delete(oldest)}
  nodeMemCache.set(key,val);
}

function decodeBytes32Pair(w0Big,w1Big){
  try{
    const hex=BigInt(w0Big||0n).toString(16).padStart(64,"0")+BigInt(w1Big||0n).toString(16).padStart(64,"0");
    let out="";
    for(let i=0;i<hex.length;i+=2){const b=parseInt(hex.slice(i,i+2),16);if(!b)break;if(b>=32&&b<=126)out+=String.fromCharCode(b)}
    return out.trim();
  }catch(e){return ""}
}

function unpackStateArr(dArr){
  if(!dArr||dArr.length<19)return null;
  const M64=(1n<<64n)-1n,M128=(1n<<128n)-1n,M160=(1n<<160n)-1n;
  const d=Array.from(dArr,x=>BigInt(x||0n));
  const d4=d[4],d5=d[5],d6=d[6],d7=d[7],d9=d[9],d10=d[10],d11=d[11],d12=d[12],d13=d[13],d14=d[14],d15=d[15],d16=d[16];
  const upHex="0x"+(d15&M160).toString(16).padStart(40,"0");
  const uTokHex="0x"+(d16&M160).toString(16).padStart(40,"0");
  const tgStr=decodeBytes32Pair(d[17],d[18]);
  const n={
    upliner:ethers.isAddress(upHex)?ethers.getAddress(upHex):ethers.ZeroAddress,
    currentTier:d[0],
    totalPHProvided:d[1],
    totalGHReceived:d[2],
    pendingBalance:d[3],
    cycleStep:d4&0xFFFFn,
    cooldownExpiry:(d4>>16n)&M64,
    hasProvidedHelp:((d4>>80n)&1n)===1n,
    isActive:((d4>>81n)&1n)===1n,
    hasPendingLOH:((d4>>82n)&1n)===1n
  };
  const e={
    originalBaselineTier:d5>>128n,
    maxUnlockedBase:d5&M128,
    activeWindowExpiry:d6&M64,
    directVolume:(d6>>64n)&M128,
    directCount:d6>>192n,
    rank:Number((d4>>88n)&0xFFn),
    verifiedPillarsCount:Number((d4>>96n)&0xFFn),
    isInQueue:((d4>>104n)&1n)===1n,
    currentLane:Number((d4>>112n)&0xFFn),
    isLive:((d4>>120n)&1n)===1n
  };
  const t=[d7,d[8],d9,d10,d11,d12,d13];
  const compMeta={
    startTs:Number(d14&0xFFFFFFFFn),
    endTs:Number((d14>>32n)&0xFFFFFFFFn),
    reqDir:Number((d14>>64n)&0xFFFFn),
    reqVol:Number((d14>>80n)&0xFFFFFFFFn),
    reqPil:Number((d14>>112n)&0xFFn),
    prizeUsd:Number((d14>>120n)&0xFFFFFFn)
  };
  const lastBoostTs=Number((d14>>144n)&0xFFFFFFFFn);
  const boosterPoolUsd=Number((d14>>176n)&((1n<<80n)-1n))/1e6;
  const estReliefUsd=Number((d16>>160n)&((1n<<96n)-1n))/1e6;
  return{n,e,t,tg:tgStr,uTok:ethers.isAddress(uTokHex)?ethers.getAddress(uTokHex):ACTIVE_USDT_ADDRESS,compMeta,lastBoostTs,boosterPoolUsd,estReliefUsd,raw:d};
}

function unpackTaskTuple(res){
  if(!res)return null;
  const m=BigInt(res.meta??res[3]??0n);
  return{
    performer:res.perf||res[0],
    verifier:res.ver||res[1],
    proofLink:res.link||res[2]||"",
    pillar:Number(m&0xFFn),
    isVerified:(m&0x100n)!==0n,
    isRejected:(m&0x200n)!==0n,
    submittedAt:Number((m>>18n)&0xFFFFFFFFFFn),
    verifiedAt:Number((m>>58n)&0xFFFFFFFFFFn),
    tipCount:Number((m>>100n)&0xFFFFFFFn),
    totalTipsCollected:m>>128n
  };
}

async function callNodeSafe(addr,idx){
  const key=addr.toLowerCase(),now=Date.now(),cached=nodeMemCache.get(key);
  if(cached&&(now-cached.ts<22000))return cached;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const p=getRpcAt(idx+attempt),cP=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,p);
      const dArr=await cP.getNodeState(addr);
      const parsed=unpackStateArr(dArr);
      if(parsed){const val={...parsed,ts:Date.now()};setBoundedCache(key,val);return val}
    }catch(err){if(attempt===2)return cached||null;await new Promise(r=>setTimeout(r,55*(attempt+1)))}
  }
  return cached||null;
}

async function callTaskSubSafe(taskId,hintIdx=0){
  const c=taskSubMemCache.get(taskId);
  if(c&&(c.s.isRejected||c.s.verifiedAt===1||(c.s.isVerified&&(Date.now()-c.ts<60000))))return c.s;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const p=attempt===0&&rProv?rProv:getRpcAt(hintIdx+attempt),cP=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,p);
      const raw=await cP.getTask(taskId),s=unpackTaskTuple(raw);
      if(s){taskSubMemCache.set(taskId,{s,ts:Date.now()});return s}
    }catch(e){await new Promise(r=>setTimeout(r,50*(attempt+1)))}
  }
  return c?c.s:null;
}

async function syncSocialConfigFromChain(force=false){
  if(!force&&(Date.now()-lastSocialSyncTs<45000))return;
  try{
    const rp=await getRProv(),cP=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,rp);
    const res=await cP.getTask(ethers.MaxUint256).catch(()=>null);
    if(res){
      lastSocialSyncTs=Date.now();
      const verAddr=res.ver||res[1];
      if(verAddr&&ethers.isAddress(verAddr)&&verAddr!==ethers.ZeroAddress)activeAuditorWallet=ethers.getAddress(verAddr);
      customSocialOverrideRaw=String(res.link||res[2]||"").replace(/\0/g,"").trim();
      applyNetworkAndSocialLinks(IS_LIVE_USDT,ACTIVE_USDT_ADDRESS);
    }
  }catch(e){}
}

const eip6963Map={},eip6963List=[];
window.addEventListener("eip6963:announceProvider",e=>{
  if(e.detail&&e.detail.provider){
    const p=e.detail.provider;if(!eip6963List.includes(p))eip6963List.push(p);
    const nm=((e.detail.info?.name||"")+" "+(e.detail.info?.rdns||"")).toLowerCase();
    if(nm.includes("safepal"))eip6963Map.safepal=p;
    if(nm.includes("metamask"))eip6963Map.metamask=p;
    if(nm.includes("trust"))eip6963Map.trust=p;
    if(nm.includes("tokenpocket")||nm.includes("tp")||nm.includes("okx"))eip6963Map.tp=p;
    if(!nm.includes("microsoft"))eip6963Map.any=p;
  }
});
window.dispatchEvent(new Event("eip6963:requestProvider"));

const RANK_ICONS=["👤","🧭","🏅","👑"],RANK_NAMES=["👤 Member","🧭 Guider","🏅 Leader","👑 Manager"];
const PILLAR_TITLES={1:"Pillar 1: Social Share",2:"Pillar 2: Mentorship",3:"Pillar 3: Video Explainer",4:"Pillar 4: Table Meeting"};
const PILLAR_GUIDES={
  1:`📢 <b style="color:var(--cyan)">Pillar 1 (Social Share):</b> Share a GHM21 post on X, Facebook, TikTok, or Telegram. Paste your public post URL below and attach a screenshot.`,
  2:`🤝 <b style="color:var(--cyan)">Pillar 2 (Mentorship):</b> Guide an active referral or prospect on wallet setup, PH/Recommit, or GHM21 rules (1-on-1 or group training). Paste the post/chat link & attach a proof screenshot.`,
  3:`🎥 <b style="color:var(--cyan)">Pillar 3 (Video Explainer):</b> Record a short video explaining GHM21 mechanics or showing your dashboard. Upload to YouTube/TikTok/FB/X, paste the video link & attach a clip or screenshot.`,
  4:`🏛️ <b style="color:var(--cyan)">Pillar 4 (Table Meeting):</b> Host an offline table huddle or online Zoom/Telegram voice session. Paste the meeting post/recording link & attach a photo or notes screenshot.`
};
const COMP_PRESETS={
  1:{name:"🔥 Launch Refer & Win",reqDir:5,reqVol:500,reqPil:1,prize:25,desc:"🔥 Launch Refer & Win: 5+ New Directs • $500+ New Team Vol • 1+ New Verified Task → Win $25 USDT!"},
  2:{name:"🚀 Builder Sprint",reqDir:8,reqVol:1000,reqPil:1,prize:50,desc:"🚀 Builder Sprint: 8+ New Directs • $1,000+ New Team Vol • 1+ New Verified Task → Win $50 USDT!"},
  3:{name:"💎 Volume Champion",reqDir:10,reqVol:2500,reqPil:2,prize:100,desc:"💎 Volume Champion: 10+ New Directs • $2,500+ New Team Vol • 2+ New Verified Tasks → Win $100 USDT!"},
  4:{name:"📢 Viral Task & Team",reqDir:5,reqVol:600,reqPil:3,prize:35,desc:"📢 Viral Task & Team: 5+ New Directs • $600+ New Team Vol • 3+ New Verified Tasks → Win $35 USDT!"},
  5:{name:"👑 Elite Leader Race",reqDir:15,reqVol:5000,reqPil:3,prize:200,desc:"👑 Elite Leader Race: 15+ New Directs • $5,000+ New Team Vol • 3+ New Verified Tasks → Win $200 USDT!"},
  6:{name:"⚡ Custom Competition",reqDir:0,reqVol:0,reqPil:3,prize:25,desc:"⚡ Custom Competition Round"}
};
const COPY_SVG=`<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_SVG=`<svg viewBox="0 0 24 24" style="stroke:#00FFA3"><polyline points="20 6 9 17 4 12"/></svg>`;
const ERC20_ABI=["function balanceOf(address) view returns (uint256)","function allowance(address,address) view returns (uint256)","function approve(address,uint256) returns (bool)"];
const VAULT_ABI=["error Unauthorized()","function protocolContract() view returns (address)","function isProtocolLocked() view returns (bool)","function setProtocolContract(address _newProtocol)"];
const PROTO_ABI=[
  "error Denied()",
  "function provideHelp(uint256 _amount, address _upliner)",
  "function recommit(uint256 _amount)",
  "function pullL2()",
  "function submitLOH()",
  "function setTelegramId(string _handle)",
  "function updateSocialConfig(string _cfg)",
  "function payFastPass(uint8 _pCode, uint256 _feeAmount)",
  "function claimManagerPool()",
  "function claimRelief()",
  "function boostSlowQueue()",
  "function claimTaskPoints()",
  "function pauseSlot()",
  "function resumeSlot(uint256 _slotIdx)",
  "function submitTask(uint8 _pillar, string _proofLink, bytes32 _mediaHash)",
  "function reviewTask(uint256 _taskId, bool _approve)",
  "function closeFeedTask(uint256 _taskId)",
  "function tipTask(uint256 _taskId, uint256 _amount)",
  "function launchComp(uint8 _preset, uint16 _durationDays, uint16 _reqDir, uint32 _reqVolUsd, uint8 _reqPil, uint24 _prizeUsd)",
  "function toggleComp(bool _active)",
  "function enterComp()",
  "function payCompWinner(address _winner, uint256 _prizeWei)",
  "function submitV1Claim(uint256 _deficitWei)",
  "function manageV1Claim(address _target, uint256 _payWei, uint8 _action)",
  "function toggleV1Recovery(bool _open)",
  "function rotateAuditor(address _newAuditor)",
  "function manageTaskVerifier(address _target, bool _grant)",
  "function setTestnetDormancy(uint8 _stage)",
  "function getTask(uint256 _id) view returns (address perf, address ver, string link, uint256 meta)",
  "function getDownlineCounts(address _u) view returns (uint256 packed)",
  "function getAddressSlice(uint8 _listType, uint256 _offset, uint256 _limit) view returns (uint256 total, address[] list)",
  "function getRecord(address _u, uint256 _idx, bool _isSlot) view returns (uint256 a, uint256 b, uint256 c)",
  "function getNodeState(address _u) view returns (uint256[19] d)",
  "event ProvideHelpExecuted(address indexed donor, address indexed seeker, uint256 amount, uint256 seekerPayout, bool isRecommitting)",
  "event PayoutDispatched(address indexed seeker, uint256 payoutAmount, uint256 remainingBalance, uint8 lane)",
  "event LOHSubmitted(address indexed node)",
  "event MilestoneReached(uint8 indexed milestoneType, uint256 milestoneValue)",
  "event RankUpgraded(address indexed node, uint8 newRank)"
];

let provider=null,signer=null,proto=null,usdt=null,userAddr="",mySponsorAddr=OPS_WALLET,lastWalType="metamask",detectedCountry="🇿🇦 South Africa";
let isTxBusy=false,isRefreshing=false,isMonLoading=false,isCompLoading=false,needManualConfirm=false,userTypedCustom=false,lohPending=false,eligRecommit=false,eligPullL1=false,isUserInL1=false,isUserInL2=false,expRecommit=20,pullCdExp=0,myTotalPH=0,myTotalGH=0,myGrantVal=0,myCycleStep=1,myPendingBal=0,myLastPayout=0,myCeiling=5000,currentVolNum=0,lastActTime=0,cooldownExp=0,actWinExp=0,userIsVerifier=false,myTgId="",myV1Def=0,myV1Status=0,v1WindowOpen=true,myPts=0,myPillarsMask=0,myWaivedMask=0;
let myRank=0,myDirects=0,myTeamVol=0,myVerPillars=0,myJoinedAt=0,myParkedLen=0,myTxLen=0,totalTaskCount=0;
let curCompId=1,curCompPreset=1,curCompActive=true,curCompMeta={startTs:0,endTs:0,reqDir:5,reqVol:500,reqPil:1,prizeUsd:25},myCompStatus=0,mySnapDir=0,mySnapPil=0,mySnapVol=0,myCompPrize=0;
let totalMgrCount=0,mgrShareDivisor=1,mgrPoolTotal=0,canClaimMgr=false,lastL1ToL9Time=0,myPendingPillarsMask=0,myCurCycleNum=1,activeL2CountOnChain=0;
let boosterPoolTotal=0,lastBoostTimeOnChain=0,myEstReliefUsd=0,myReliefClaimed=false,myNodeActive=false;
let cachedParkedKey="",cachedParkedHtml="None",monReqSeq=0;
let queueCache={l1:[],l2:[]},l2FullAddrs=[],l2TotalWaiting=0,searchedL2Cards=null,monitorCache=[],monActiveFilter="all",tgChatMap={},unregisteredRefWarningPending=false;

function toggleMobMenu(){$('mobMenu').classList.toggle('open')}
function updatePillarGuide(){
  const sel=$('taskPillarSel'),box=$('pillarGuideBox');
  if(sel&&box)box.innerHTML=PILLAR_GUIDES[Number(sel.value)||1]||PILLAR_GUIDES[1];
  syncFastPassBtnState();
}
function syncFastPassBtnState(){
  const sel=$('taskPillarSel'),fpBtn=$('taskFpBtn'),subBtn=$('taskSubBtn');
  if(!sel||!fpBtn||!subBtn)return;
  const pNum=Number(sel.value)||1,bit=1<<(pNum-1);
  const isDone=(myPillarsMask&bit)!==0,isPend=(myPendingPillarsMask&bit)!==0,isWaived=(myWaivedMask&bit)!==0;
  subBtn.disabled=isDone||isPend;
  fpBtn.disabled=isDone||isWaived;
  fpBtn.innerText=isWaived?"Waived ✓ ($2)":(isDone?"Completed ✓":"Fast Pass Waiver ($2)");
}
function onCompPresetChange(){
  const isCust=$('compPresetSel')?.value==='6';
  if($('compCustomRow'))$('compCustomRow').style.display=isCust?'flex':'none';
  if($('cCustTitle'))$('cCustTitle').style.display=isCust?'block':'none';
}
function getActiveCompCfg(){
  if(curCompMeta&&(curCompMeta.prizeUsd>0||curCompPreset===6)){
    const pBase=COMP_PRESETS[curCompPreset]||COMP_PRESETS[6];
    const rD=curCompMeta.reqDir,rV=curCompMeta.reqVol,rP=curCompMeta.reqPil,pZ=curCompMeta.prizeUsd||pBase.prize;
    if(curCompPreset<=5&&COMP_PRESETS[curCompPreset])return COMP_PRESETS[curCompPreset];
    const parts=[];
    if(rD>0)parts.push(`${rD}+ New Directs`);
    if(rV>0)parts.push(`$${rV.toLocaleString()}+ New Team Vol`);
    if(rP>0)parts.push(`${rP}+ Verified Task${rP===1?'':'s'}`);
    return{name:"⚡ Custom Competition",reqDir:rD,reqVol:rV,reqPil:rP,prize:pZ,desc:`⚡ Custom Challenge: ${parts.join(' • ')||'Active Participation'} → Win $${pZ} USDT!`};
  }
  return COMP_PRESETS[curCompPreset]||COMP_PRESETS[1];
}
function resetUserRuntimeFlags(){
  lohPending=false;eligRecommit=false;eligPullL1=false;isUserInL1=false;isUserInL2=false;
  myPendingBal=0;myLastPayout=0;pullCdExp=0;cooldownExp=0;actWinExp=0;canClaimMgr=false;
  myPendingPillarsMask=0;myWaivedMask=0;myCurCycleNum=1;myEstReliefUsd=0;myReliefClaimed=false;myNodeActive=false;cachedParkedKey="";
}
function hydrateFromCache(){
  try{
    const lastA=localStorage.getItem('ghm21_last_addr');
    if(lastA&&localStorage.getItem('ghm21_connected_wallet')==='1')$('walTxt').innerText=lastA.slice(0,6)+"..."+lastA.slice(-4);
    const raw=localStorage.getItem(SNAP_KEY);if(!raw)return;
    const s=JSON.parse(raw);
    if(s.vol>0){currentVolNum=s.vol;$('volDisplay').innerText=s.vol.toLocaleString('en-US',{minimumFractionDigits:2})+" USDT"}
    if(s.vBal)$('vBalTxt').innerText=s.vBal;
    if(typeof s.l2Tot==='number')l2TotalWaiting=s.l2Tot;
    if(s.q&&(s.q.l1?.length||s.q.l2?.length)){queueCache={l1:s.q.l1||[],l2:(s.q.l2||[]).slice(0,VISIBLE_L2_CAP)};renderMarketplace()}
    if(s.u&&lastA&&s.u.addr?.toLowerCase()===lastA.toLowerCase()){
      isUserInL1=Boolean(s.u.inL1);isUserInL2=Boolean(s.u.inL2);myCycleStep=s.u.step||1;myPendingBal=s.u.pend||0;expRecommit=s.u.rec||20;
      $('myPosTxt').innerText=s.u.pos||"Idle";$('myRemTxt').innerText=`$${myPendingBal.toFixed(2)}`;$('myRecTxt').innerText=s.u.recTxt||`$${expRecommit.toFixed(2)}`;syncDockUI();
    }
  }catch(e){}
}
function saveCacheSnapshot(vBalStr){
  try{
    localStorage.setItem(SNAP_KEY,JSON.stringify({vol:currentVolNum,vBal:vBalStr,l2Tot:l2TotalWaiting,q:queueCache,u:userAddr?{addr:userAddr,inL1:isUserInL1,inL2:isUserInL2,step:myCycleStep,pend:myPendingBal,rec:expRecommit,pos:$('myPosTxt').innerText,recTxt:$('myRecTxt').innerText}:null}));
  }catch(e){}
}
async function getRProv(forceRotate=false){
  if(rProv&&!forceRotate&&(Date.now()-lastRaceTs<45000))return rProv;
  if(rpcPool.length===0)getRpcAt(0);
  try{
    const winner=await Promise.any(rpcPool.map((p,idx)=>Promise.race([p.getBlockNumber().then(bn=>{if(bn>0)return{p,idx};throw new Error("bad")}),new Promise((_,rej)=>setTimeout(()=>rej(new Error("to")),2000))])));
    rpcIdx=winner.idx;rProv=winner.p;lastRaceTs=Date.now();$('liveNetDot').innerText="🟢";return rProv;
  }catch(e){rpcIdx=(rpcIdx+1)%RPCS.length;return(rProv=getRpcAt(0))}
}
async function validateReferralLinkOnChain(candAddr){
  try{
    if(!candAddr||!ethers.isAddress(candAddr))return;
    const clean=ethers.getAddress(candAddr);
    if(clean.toLowerCase()===OPS_WALLET.toLowerCase()){localStorage.setItem(REF_KEY,OPS_WALLET);return}
    const res=await callNodeSafe(clean,0);
    if(res&&res.n.isActive){localStorage.setItem(REF_KEY,clean);unregisteredRefWarningPending=false}
    else{$('badRefAddrTxt').innerText=clean;unregisteredRefWarningPending=true;openMod('badRefModal')}
  }catch(e){}
}
function acceptDefaultOpsSponsor(){localStorage.setItem(REF_KEY,OPS_WALLET);unregisteredRefWarningPending=false;closeMod('badRefModal');refreshAll(true)}
function waitAndContactUpliner(){closeMod('badRefModal');alert("Please ask your upliner to complete their first Provide Help on-chain or send you their active registered wallet link before you Provide Help.")}

async function callTgApi(method,options){
  for(const base of getTgApiBases()){
    const ctrl=new AbortController(),tId=setTimeout(()=>ctrl.abort(),10000);
    try{const r=await fetch(`${base}/${method}`,{...options,signal:ctrl.signal});clearTimeout(tId);const j=await r.json().catch(()=>null);if(r.ok&&j&&j.ok)return j}catch(e){clearTimeout(tId)}
  }
  return null;
}
async function syncTelegramBotMap(){
  try{
    const saved=JSON.parse(localStorage.getItem('ghm21_tg_chat_map')||'{}');tgChatMap={...saved,...tgChatMap};
    const r=await callTgApi("getUpdates?limit=100",{method:'GET'});
    if(r&&Array.isArray(r.result)){
      r.result.forEach(u=>{const from=u.message?.from||u.my_chat_member?.from;if(from&&from.id){tgChatMap[String(from.id)]=String(from.id);if(from.username)tgChatMap['@'+from.username.toLowerCase()]=String(from.id)}});
      localStorage.setItem('ghm21_tg_chat_map',JSON.stringify(tgChatMap));
    }
  }catch(e){}
}
function extractChatId(rawTg){
  if(!rawTg)return "";
  const s=String(rawTg).trim();
  if(/^\d+$/.test(s))return s;
  if(s.includes(':')){const p=s.split(':');if(/^\d+$/.test(p[1]))return p[1]}
  const low=s.startsWith('@')?s.toLowerCase():('@'+s.toLowerCase());
  return tgChatMap[low]||"";
}
function getDisplayTg(rawTg){return rawTg?String(rawTg).split(':')[0]:""}
async function sendPrivateTg(rawTg,text){
  if(!rawTg||!text)return false;
  let cid=extractChatId(rawTg);if(!cid){await syncTelegramBotMap();cid=extractChatId(rawTg)}
  if(!cid)return false;
  return Boolean(await callTgApi("sendMessage",{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cid,text,parse_mode:'Markdown'})}));
}
async function tgPost(chatId,text){
  if(!chatId||!text)return false;
  return Boolean(await callTgApi("sendMessage",{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,parse_mode:'Markdown'})}));
}
async function compressImageFile(file){
  if(!file||!file.type.startsWith('image/'))return file;
  return new Promise(resolve=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const maxDim=1050;let w=img.width,h=img.height;
      if(w>maxDim||h>maxDim){if(w>h){h=Math.round((h*maxDim)/w);w=maxDim}else{w=Math.round((w*maxDim)/h);h=maxDim}}
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(img,0,0,w,h);
      cv.toBlob(b=>resolve(b?new File([b],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'}):file),'image/jpeg',0.76);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file)};img.src=url;
  });
}
async function uploadToTelegramFast(endpoint,chatId,caption,file){
  const isVid=file&&file.type&&file.type.startsWith('video/');
  const mediaFile=isVid?file:await compressImageFile(file),actualEndpoint=isVid?'sendVideo':'sendPhoto',fieldName=isVid?'video':'photo',timeoutMs=isVid?22000:11000;
  for(const base of getTgApiBases()){
    const fd=new FormData();fd.append('chat_id',chatId);fd.append('caption',caption);fd.append('parse_mode','Markdown');fd.append(fieldName,mediaFile);
    const ctrl=new AbortController(),tId=setTimeout(()=>ctrl.abort(),timeoutMs);
    try{const res=await fetch(`${base}/${actualEndpoint}`,{method:'POST',body:fd,signal:ctrl.signal});clearTimeout(tId);const j=await res.json().catch(()=>null);if(res.ok&&j&&j.ok)return true}catch(e){clearTimeout(tId)}
  }
  return await tgPost(chatId,caption+`\n📎 _Verified Media Proof: ${file.name}_`);
}
function detectUserCountry(){
  const manual=localStorage.getItem('ghm21_loh_country_manual');
  if(manual&&!manual.includes('Global')){detectedCountry=manual;return}
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";
  const tzMap={"Asia/Kolkata":"🇮🇳 India","Asia/Calcutta":"🇮🇳 India","Asia/Manila":"🇵🇭 Philippines","Africa/Johannesburg":"🇿🇦 South Africa","Africa/Lagos":"🇳🇬 Nigeria","Africa/Nairobi":"🇰🇪 Kenya","Africa/Accra":"🇬🇭 Ghana","Africa/Kampala":"🇺🇬 Uganda","Africa/Harare":"🇿🇼 Zimbabwe","Africa/Lusaka":"🇿🇲 Zambia","Africa/Gaborone":"🇧🇼 Botswana","Asia/Dubai":"🇦🇪 UAE","Europe/London":"🇬🇧 UK","America/New_York":"🇺🇸 USA"};
  if(tzMap[tz])detectedCountry=tzMap[tz];
}
async function computeFileSha256Hex(file){
  if(!file)return ethers.ZeroHash;
  try{
    if(window.crypto&&window.crypto.subtle){
      const buf=await file.arrayBuffer(),digest=await window.crypto.subtle.digest("SHA-256",buf);
      return "0x"+Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
    }
  }catch(e){}
  return ethers.id(`${file.name}_${file.size}_${file.lastModified}`);
}
function normalizeProofUrl(rawUrl){
  let u=String(rawUrl||"").trim();if(!u)return "";
  try{
    if(!/^https?:\/\//i.test(u))u="https://"+u;
    const parsed=new URL(u);
    let host=parsed.hostname.toLowerCase().replace(/^(www\.|web\.|m\.|mobile\.|touch\.|mbasic\.)/,"");
    if(host==="x.com")host="twitter.com";
    let path=parsed.pathname.replace(/\/+$/,"");
    const keepKeys=["v","story_fbid","fbid","id","multi_permalinks","p","post_id","video_id"],kept=[];
    keepKeys.forEach(k=>{const val=parsed.searchParams.get(k);if(val)kept.push(`${k}=${encodeURIComponent(val)}`)});
    return `https://${host}${path}${kept.length>0?'?'+kept.join('&'):''}`.slice(0,128);
  }catch(e){return u.toLowerCase().replace(/^https?:\/\/(www\.|web\.|m\.)?/,"https://").split(/[?#]/)[0].replace(/\/+$/,"").slice(0,128)}
}

function openCertModal(){
  if(!userAddr)return openMod('walletModal');
  if(myRank<1)return alert("🔒 Official Leadership Certificates unlock automatically once your node qualifies on-chain as a Guider (Rank 1), Leader (Rank 2), or Manager (Rank 3)!");
  $('certNameIn').value=localStorage.getItem('ghm21_loh_name')||getDisplayTg(myTgId)||"";
  $('certMobileImg').style.display='none';$('certMobHint').style.display='none';$('certCanvas').style.display='block';$('certModal').style.display='flex';
  drawCertificateCanvas();
}
let cachedCertFile=null,cachedCertDataUrl="";
function dataUrlToPngFile(dataUrl,fileName){
  const parts=dataUrl.split(','),bstr=atob(parts[1]);let n=bstr.length;const u8=new Uint8Array(n);while(n--)u8[n]=bstr.charCodeAt(n);
  return new File([u8],fileName,{type:'image/png'});
}
function prepareCachedCertFile(cv){
  try{
    const rName=["Member","Guider","Leader","Manager"][Math.min(3,Math.max(1,myRank||1))],fileName=`GHM21_${rName}_Certificate_${(userAddr||'Node').slice(0,8)}.png`;
    cachedCertDataUrl=cv.toDataURL('image/png');cachedCertFile=dataUrlToPngFile(cachedCertDataUrl,fileName);
  }catch(e){}
}
function drawCertificateCanvas(){
  const cv=$('certCanvas');if(!cv)return;
  const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,rankLabels=["MEMBER","GUIDER","LEADER","MANAGER"],rankColors=["#00D1FF","#00FFA3","#00D1FF","#FFD700"];
  const rLvl=Math.min(3,Math.max(1,myRank||1)),primaryCol=rankColors[rLvl];
  const bgGrad=ctx.createLinearGradient(0,0,W,H);bgGrad.addColorStop(0,"#05070B");bgGrad.addColorStop(0.5,"#0B121C");bgGrad.addColorStop(1,"#04080E");
  ctx.fillStyle=bgGrad;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#00FFA3";ctx.lineWidth=4;ctx.strokeRect(36,36,W-72,H-72);
  ctx.strokeStyle="#00D1FF";ctx.lineWidth=1.5;ctx.strokeRect(50,50,W-100,H-100);
  ctx.textAlign="center";ctx.fillStyle="#00FFA3";ctx.font="800 16px monospace";ctx.fillText("GHM21 DECENTRALIZED P2P MUTUAL AID PROTOCOL • BNB SMART CHAIN",W/2,185);
  ctx.fillStyle="#FFFFFF";ctx.font="900 42px system-ui, -apple-system, sans-serif";ctx.fillText("CERTIFICATE OF LEADERSHIP",W/2,245);
  ctx.fillStyle="#909FB2";ctx.font="500 18px system-ui, -apple-system, sans-serif";ctx.fillText("THIS OFFICIALLY CERTIFIES THAT THE VERIFIED WEB3 NODE OPERATED BY",W/2,295);
  const customName=($('certNameIn')?.value||"").trim()||localStorage.getItem('ghm21_loh_name')||getDisplayTg(myTgId)||"VERIFIED GHM21 BUILDER";
  ctx.fillStyle=primaryCol;ctx.font="900 44px system-ui, -apple-system, sans-serif";ctx.fillText(customName.toUpperCase(),W/2,358);
  ctx.fillStyle="#F5F7FA";ctx.font="700 20px monospace";ctx.fillText(`WALLET NODE: ${userAddr||"0x0000...0000"}`,W/2,398);
  const pillW=440,pillH=68,pillX=(W-pillW)/2,pillY=475;
  ctx.fillStyle="rgba(0,255,163,0.10)";ctx.strokeStyle=primaryCol;ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(pillX,pillY,pillW,pillH,14);ctx.fill();ctx.stroke();
  ctx.fillStyle="#FFFFFF";ctx.font="900 32px monospace";ctx.fillText(`★ ${rankLabels[rLvl]} RANK ★`,W/2,pillY+45);
  const boxY=640,boxH=72,boxW=940,boxX=(W-boxW)/2;
  ctx.fillStyle="rgba(19,26,36,0.88)";ctx.strokeStyle="rgba(255,255,255,0.12)";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(boxX,boxY,boxW,boxH,10);ctx.fill();ctx.stroke();
  ctx.font="700 18px monospace";ctx.fillStyle="#00FFA3";ctx.fillText(`DIRECT REFERRALS: ${myDirects}`,boxX+170,boxY+43);
  ctx.fillStyle="#00D1FF";ctx.fillText(`L1–L9 TEAM VOL: $${myTeamVol.toLocaleString('en-US',{maximumFractionDigits:0})} USDT`,W/2,boxY+43);
  ctx.fillStyle="#88F7E2";ctx.fillText(`VERIFIED PILLARS: ${myVerPillars}`,boxX+boxW-170,boxY+43);
  const rawProof=ethers.id(`${GHM21_PROTOCOL_ADDRESS.toLowerCase()}_${(userAddr||'').toLowerCase()}_RANK_${rLvl}`),shortHash=rawProof.slice(0,18)+"..."+rawProof.slice(-10);
  const hashEl=$('certHashPreview');if(hashEl)hashEl.innerText=`On-Chain Seal: ${rawProof.slice(0,14)}...${rawProof.slice(-6)}`;
  const issueDate=new Date().toISOString().slice(0,10);
  ctx.textAlign="left";ctx.fillStyle="#909FB2";ctx.font="600 14px monospace";
  ctx.fillText(`PROTOCOL CONTRACT: ${GHM21_PROTOCOL_ADDRESS}`,85,805);ctx.fillText(`SAFETY NET VAULT : ${SAFETY_VAULT_ADDRESS}`,85,830);
  ctx.fillStyle="#00FFA3";ctx.fillText(`CRYPTOGRAPHIC SEAL: ${shortHash}`,85,855);
  ctx.textAlign="right";ctx.fillStyle="#909FB2";
  ctx.fillText(`NETWORK: BNB SMART CHAIN (BEP-20)`,W-85,805);ctx.fillText(`DATE OF VERIFICATION: ${issueDate}`,W-85,830);
  ctx.fillStyle="#00D1FF";ctx.fillText(`STATUS: 100% ON-CHAIN VERIFIED ✓`,W-85,855);
  prepareCachedCertFile(cv);
}
async function downloadCertificatePNG(){
  const cv=$('certCanvas');if(!cachedCertFile)drawCertificateCanvas();
  const rName=["Member","Guider","Leader","Manager"][Math.min(3,Math.max(1,myRank||1))],fileName=cachedCertFile?cachedCertFile.name:`GHM21_${rName}_Certificate_${(userAddr||'Node').slice(0,8)}.png`,dataUrl=cachedCertDataUrl||cv.toDataURL('image/png');
  const mobImg=$('certMobileImg'),mobHint=$('certMobHint');
  if(mobImg){mobImg.src=dataUrl;mobImg.style.display='block';cv.style.display='none'}
  if(mobHint)mobHint.style.display='block';
  if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"")&&cachedCertFile&&navigator.canShare){
    try{if(navigator.canShare({files:[cachedCertFile]})){await navigator.share({files:[cachedCertFile],title:`GHM21 ${rName} Certificate`,text:`Official GHM21 ${rName} Leadership Certificate`});return}}catch(_){}
  }
  try{
    const blobUrl=URL.createObjectURL(cachedCertFile||dataUrlToPngFile(dataUrl,fileName)),link=document.createElement('a');
    link.href=blobUrl;link.download=fileName;document.body.appendChild(link);link.click();document.body.removeChild(link);setTimeout(()=>URL.revokeObjectURL(blobUrl),10000);
  }catch(e){}
}
async function sendCertificateToTelegram(btnEl){
  if(!userAddr)return openMod('walletModal');
  if(!myTgId||myTgId.length<4)return alert(`Please link your Telegram @username or Chat ID in your Dashboard first (and press Start on @${BOT_USERNAME}) so the bot can send your certificate directly to your chat!`);
  drawCertificateCanvas();if(!cachedCertFile)return alert("Certificate image not ready yet. Tap Update first.");
  const orig=btnEl?btnEl.innerText:"📲 Send to Telegram";if(btnEl){btnEl.disabled=true;btnEl.innerText="Sending..."}
  let cid=extractChatId(myTgId);if(!cid){await syncTelegramBotMap();cid=extractChatId(myTgId)}
  if(!cid){if(btnEl){btnEl.disabled=false;btnEl.innerText=orig}return alert(`Please open @${BOT_USERNAME} in Telegram and tap 'Start' once so the bot can message you, then tap Send to Telegram again!`)}
  const rName=["Member","Guider","Leader","Manager"][Math.min(3,Math.max(1,myRank||1))];
  const ok=await uploadToTelegramFast('sendPhoto',cid,`🎖️ *Official GHM21 ${rName} Leadership Certificate*\nWallet: \`${userAddr}\`\n_Tap the image above and select 'Save to Gallery' / 'Save Image'!_`,cachedCertFile);
  if(btnEl){btnEl.disabled=false;btnEl.innerText=orig}
  alert(ok?`✅ Certificate sent directly to your Telegram (@${BOT_USERNAME})! Open Telegram and tap 'Save to Gallery'.`:"⚠️ Could not reach Telegram right now. Long-press the certificate image above to Save Image.");
}

async function waitTxFast(tx){
  const rp=await getRProv();
  const poll=async()=>{
    for(let i=0;i<60;i++){const rec=await rp.getTransactionReceipt(tx.hash).catch(()=>null);if(rec&&rec.blockNumber){if(rec.status===0)throw new Error("Transaction reverted on-chain.");return rec}await new Promise(r=>setTimeout(r,280))}
    const wRec=await tx.wait().catch(()=>null);if(wRec&&wRec.status===0)throw new Error("Transaction reverted on-chain.");return wRec;
  };
  return await Promise.race([tx.wait().then(r=>{if(r&&r.status===0)throw new Error("Transaction reverted on-chain.");return r}).catch(()=>poll()),poll()]);
}
function isCoalesceOrRpcErr(err){
  const m=String(err?.message||err?.shortMessage||err?.info?.error?.message||"").toLowerCase();
  return m.includes("coalesce")||m.includes("internal")||m.includes("-32")||m.includes("missing revert")||m.includes("failed to fetch");
}
function isUserCancelErr(e){
  const c=e?.code||e?.info?.error?.code,m=String(e?.shortMessage||e?.reason||e?.message||"").toLowerCase();
  return c===4001||c==="ACTION_REJECTED"||m.includes("user rejected")||m.includes("user denied")||m.includes("user cancel")||m.includes("rejected the request")||m.includes("timed out after 45s")||m.includes("cancelled");
}
function alertPublicErr(e,prefix,deniedHint){
  if(isUserCancelErr(e))return;
  const raw=String(e?.reason||e?.shortMessage||e?.message||"Transaction could not be completed.");
  if(raw.includes("Denied")&&deniedHint)return alert(deniedHint);
  alert((prefix?prefix+": ":"")+raw);
}
function withWalletTimeout(promise,ms=45000){
  return Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error("Wallet signature timed out after 45s.")),ms))]);
}
async function sendContractTx(contract,method,args){
  const rp=await getRProv(),cAddr=GHM21_PROTOCOL_ADDRESS,rContract=new ethers.Contract(cAddr,PROTO_ABI,rp);
  const [simRes,estRes]=await Promise.allSettled([
    rContract[method].staticCall(...args,{from:userAddr}),
    rContract[method].estimateGas(...args,{from:userAddr})
  ]);
  if(simRes.status==="rejected"&&!isCoalesceOrRpcErr(simRes.reason))throw simRes.reason;
  let gasLimitVal=320000n;
  if(estRes.status==="fulfilled"&&estRes.value)gasLimitVal=(estRes.value*118n)/100n;
  try{return await withWalletTimeout(contract[method](...args,{gasLimit:gasLimitVal}))}
  catch(err){
    if(isCoalesceOrRpcErr(err)){
      try{return await withWalletTimeout(contract[method](...args))}
      catch(_){const data=new ethers.Interface(PROTO_ABI).encodeFunctionData(method,args);return await withWalletTimeout(signer.sendTransaction({to:cAddr,data,gasLimit:gasLimitVal}))}
    }
    throw err;
  }
}

function openMod(id){
  $(id).style.display='flex';
  if(id==='dashModal'){refreshAll(true);loadTxHistory();loadL1ToL9(null,false)}
  if(id==='vaultModal'){updateVaultBoosterAndReliefUI();refreshAll(true)}
  if(id==='lohModal')prepareLohModal();
  if(id==='tasksModal'){syncPillarDropdownLocks();updatePillarGuide()}
  if(id==='v1Modal')$('v1AddrIn').value=userAddr||"Connect Wallet First";
  if(id==='feedModal')loadFeed(false);
  if(id==='compModal')loadCompetitions(null,false);
  if(id==='monModal')loadMonitor(null,false);
}
function closeMod(id){$(id).style.display='none'}

function syncPillarDropdownLocks(){
  const sel=$('taskPillarSel');if(!sel)return;
  const baseLabels=[
    {val:"1",txt:"Pillar 1: Social Share (+1 Pt) — Share on X/FB & submit URL",bit:1},
    {val:"2",txt:"Pillar 2: Mentorship (+2 Pts) — Guide referrals & submit proof",bit:2},
    {val:"3",txt:"Pillar 3: Video Explainer (+3 Pts) — Record short video & upload link",bit:4},
    {val:"4",txt:"Pillar 4: Table Meeting (+5 Pts) — Host huddle & submit notes",bit:8}
  ];
  let firstAvailable="";
  Array.from(sel.options).forEach((opt,i)=>{
    const item=baseLabels[i],isDone=(myPillarsMask&item.bit)!==0,isPend=(myPendingPillarsMask&item.bit)!==0,isWaived=(myWaivedMask&item.bit)!==0;
    opt.disabled=isDone||isPend;
    opt.text=isDone?`✅ ${item.txt} (Done — Complete others to reset)`:(isPend?`⏳ ${item.txt} (Pending Review in Feed)`:(isWaived?`🎟️ ${item.txt} (Fast Pass Waived — Real Proof Open)`:item.txt));
    if(!isDone&&!isPend&&!firstAvailable)firstAvailable=item.val;
  });
  if(firstAvailable&&sel.selectedOptions[0]?.disabled)sel.value=firstAvailable;
  updatePillarGuide();
}

function prepareLohModal(){
  const n=localStorage.getItem('ghm21_loh_name')||"";if(n)$('lohName').value=n;
  const savedC=localStorage.getItem('ghm21_loh_country_manual');
  $('lohCountry').value=(savedC&&!savedC.includes('Global'))?savedC:detectedCountry;
  $('lohText').value=`Received my ${myLastPayout>0?'$'+myLastPayout.toFixed(2)+' USDT ':''}GHM21 payout! Code is Law!`;
  $('lohFile').value="";
  const isFreeLoh=(myLastPayout>0&&myLastPayout<=5.000001);
  $('lohFpLbl').innerText=isFreeLoh?`Instant LOH Unlock (≤$5 Payout = FREE)`:`Instant LOH Fast Pass ($0.50)`;
  $('lohFpBtn').innerText=isFreeLoh?`Free Instant Unlock ($0)`:`Pay $0.50 Fast Pass`;
}
function payLohFastPass(btnEl){payFastPass((myLastPayout>0&&myLastPayout<=5.000001)?'0':'0.5',6,btnEl)}
function copyViralLohShare(btnEl){
  const amtStr=myLastPayout>0?`$${myLastPayout.toFixed(2)} USDT `:"";
  const refUrl=userAddr?`${window.location.origin}${window.location.pathname.replace(/index\.html$/,"")}?ref=${userAddr}`:window.location.origin;
  const msg=`💸 Just received ${amtStr}instant P2P payout on GHM21 (BNB Smart Chain)!\n✅ Zero-Balance Smart Contract • Code is Law\n👉 Join my node: ${refUrl}`;
  if(navigator.clipboard)navigator.clipboard.writeText(msg);
  if(btnEl){const orig=btnEl.innerText;btnEl.innerText="✓ Copied!";setTimeout(()=>btnEl.innerText=orig,1600)}else alert("Copied share text!");
}

function checkFirstTimePledge(addr){
  if(localStorage.getItem("ghm21_pledge_done_forever")==="true")return;
  if(addr&&localStorage.getItem("ghm21_pledge_"+addr.toLowerCase())==="true"){localStorage.setItem("ghm21_pledge_done_forever","true");return}
  $('pledgeCloseX').style.display='none';$('pledgeCheckWrap').style.display='flex';$('pledgeCheck').checked=false;$('pledgeAcceptBtn').innerText="Agree & Continue";openMod('pledgeModal');
}
function acceptPledge(){
  if($('pledgeCheckWrap').style.display!=='none'&&!$('pledgeCheck').checked)return alert("Please tick the agreement checkbox to continue.");
  localStorage.setItem("ghm21_pledge_done_forever","true");if(userAddr)localStorage.setItem("ghm21_pledge_"+userAddr.toLowerCase(),"true");closeMod('pledgeModal');
}
function openPledgeMenu(){$('pledgeCloseX').style.display='inline-block';$('pledgeCheckWrap').style.display='none';$('pledgeAcceptBtn').innerText="Close Pledge";openMod('pledgeModal')}

function getV1StorageKey(){return `ghm21_v1_${C_PREF}_${(userAddr||'anon').toLowerCase()}`}
function syncV1Visibility(){
  const el=$('footV1Link');
  if(el)el.style.display=(!v1WindowOpen||myV1Def>0||myV1Status>0||(userAddr&&localStorage.getItem(getV1StorageKey())==='true'))?'none':'inline';
  const tBtn=$('v1ToggleWinBtn');
  if(tBtn){
    tBtn.innerText=v1WindowOpen?"🔒 Close V1 Window":"🔓 Re-Open V1 Window";
    tBtn.className=v1WindowOpen?"btn-sm red":"btn-sm cyan";
  }
}

async function submitV1Claim(){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  if(!v1WindowOpen)return alert("The V1 Recovery submission window is currently closed.");
  const d=Number($('v1DefIn').value);if(!d||d<=0)return alert("Enter your unrecovered V1 deficit amount (greater than $0 USDT).");
  const btn=$('v1SubBtn');
  try{
    isTxBusy=true;btn.disabled=true;btn.innerText="Confirm in Wallet...";
    const tx=await sendContractTx(proto,"submitV1Claim",[ethers.parseEther(d.toString())]);
    btn.innerText="Confirming...";await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    await tgPost(RECOVERY_CHANNEL,`🛡️ *On-Chain V1 Recovery Registered*\nNode: \`${userAddr}\`\nUnrecovered Deficit: *$${d.toFixed(2)} USDT*`);
    localStorage.setItem(getV1StorageKey(),'true');myV1Def=d;syncV1Visibility();closeMod('v1Modal');alert("✅ V1 Deficit recorded on-chain and posted to the Recovery Channel!");
    refreshAll(true);
  }catch(e){isTxBusy=false;btn.disabled=false;btn.innerText="Submit On-Chain";alertPublicErr(e,"V1 Recovery Notice","You may have already submitted a V1 deficit claim or the window is closed.")}
}
function dismissV1Forever(){if(userAddr)localStorage.setItem(getV1StorageKey(),'true');syncV1Visibility();closeMod('v1Modal')}

function copyRaw(txt,e,btn){if(e)e.stopPropagation();if(navigator.clipboard)navigator.clipboard.writeText(txt);if(btn){btn.innerHTML=CHECK_SVG;setTimeout(()=>btn.innerHTML=COPY_SVG,1000)}else alert("Copied: "+txt)}
function copySponsor(e,btn){copyRaw(mySponsorAddr||OPS_WALLET,e,btn)}
function highlightMatchingChip(val){document.querySelectorAll('.tiers .chip').forEach(c=>{if(Number(c.innerText.replace(/[^0-9]/g,''))===Number(val))c.classList.add('active');else c.classList.remove('active')})}
function onPhInputType(val){
  needManualConfirm=false;userTypedCustom=true;
  const num=Number(val);if(num>=20&&num%10===0)localStorage.setItem('ghm21_ph_'+C_PREF,String(num));
  highlightMatchingChip(num);syncDockUI();
}
function setTier(v){
  if(isTxBusy)return;needManualConfirm=false;
  if(eligRecommit&&myPendingBal===0&&v!==expRecommit){alert(`You are on Step ${myCycleStep}/3 of your cycle. Please complete your 50% Recommitment ($${expRecommit.toFixed(2)}) first!`);v=expRecommit}
  userTypedCustom=(v!==10&&v!==expRecommit);if(v>=20)localStorage.setItem('ghm21_ph_'+C_PREF,String(v));
  $('phInput').value=v;highlightMatchingChip(v);syncDockUI();
}
function syncDockUI(){
  if(isTxBusy)return;
  const phIn=$('phInput');let v=Number(phIn.value)||20;
  if(eligRecommit&&myPendingBal===0&&document.activeElement!==phIn){v=expRecommit;phIn.value=expRecommit}
  else if(eligPullL1&&!userTypedCustom&&document.activeElement!==phIn){v=10;phIn.value=10}
  else if(eligRecommit&&!eligPullL1&&!userTypedCustom&&document.activeElement!==phIn){v=expRecommit;phIn.value=expRecommit}
  highlightMatchingChip(v);
  const now=Math.floor(Date.now()/1000),isPull=eligPullL1&&(v===10),isRec=!isPull&&eligRecommit&&(v===expRecommit)&&(myTotalPH+myTotalGH>0),inPullCd=!eligPullL1&&!isRec&&(pullCdExp>now)&&(v===10);
  const fee=(isPull||inPullCd)?0.25:(isRec?(v*0.05):0),tot=v+fee,feeEl=$('dockFeeTxt'),leftEl=$('dockLeftHint');
  if(lohPending){leftEl.innerText=`⚠️ LOH Required ($${myLastPayout.toFixed(2)} Payout)`;feeEl.innerText=`Submit LOH to unlock Step ${myCycleStep}/3 (${myPendingBal>0?'+$'+myPendingBal.toFixed(2)+' to L2':'Next Action'})`}
  else if(isUserInL1){leftEl.innerText=`🟢 Active in Lane 1 (Step ${myCycleStep}/3)`;feeEl.innerText=`Seeking: $${myPendingBal.toFixed(2)} USDT | Next: $${expRecommit.toFixed(2)}`}
  else{
    if(myGrantVal>0)leftEl.innerText=`🎁 +$${(myGrantVal*0.65).toFixed(2)} Grant Revival!`;
    else if(isPull||inPullCd)leftEl.innerText=`Pulls L2 + $10 to L1`;
    else if(isRec)leftEl.innerText=`140% Listed (+$${(v*1.4).toFixed(0)} to L1)`;
    else leftEl.innerText=`65% Listed to L1`;
    if(isPull||inPullCd)feeEl.innerText=`New L1 Bal: $${(myPendingBal+10).toFixed(2)} | Fee: $0.25`;
    else if(isRec)feeEl.innerText=`5% Fee: $${fee.toFixed(2)} | Total: $${tot.toFixed(2)} USDT`;
    else feeEl.innerText=`Rebate (15%): $${(v*0.15).toFixed(2)} | Total: $${v.toFixed(2)} USDT`;
  }
  const btn=$('phBtn');
  if(isUserInL1){btn.disabled=true;btn.innerText="Active in L1";btn.classList.remove('blink')}
  else if(lohPending){btn.disabled=false;btn.innerText="Submit LOH";btn.classList.add('blink');btn.onclick=()=>openMod('lohModal')}
  else if(cooldownExp>now){btn.disabled=true;btn.innerText="Cooldown";btn.classList.remove('blink')}
  else if(inPullCd){btn.disabled=true;btn.innerText=`Pull CD (${fmtDur(pullCdExp-now)})`;btn.classList.remove('blink')}
  else if(needManualConfirm){btn.disabled=false;btn.innerText=`✓ Confirm $${tot.toFixed(2)}`;btn.classList.add('blink');btn.onclick=executePH}
  else if(isPull){btn.disabled=false;btn.innerText="Pull L2 ($10.25)";btn.classList.remove('blink');btn.onclick=executePH}
  else if(isRec){btn.disabled=false;btn.innerText=`Recommit ($${expRecommit})`;btn.classList.remove('blink');btn.onclick=executePH}
  else{btn.disabled=false;btn.innerText="Provide Help";btn.classList.remove('blink');btn.onclick=executePH}
}

function getCandidateProviders(type){
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  const list=[],add=p=>{if(!p)return;if(p.ethereum&&(p.ethereum.request||p.ethereum.enable||p.ethereum.send)&&!list.includes(p.ethereum))list.push(p.ethereum);if((typeof p.request==='function'||typeof p.enable==='function'||typeof p.send==='function')&&!list.includes(p))list.push(p)};
  const provs=Array.isArray(window.ethereum?.providers)?window.ethereum.providers:[];
  if(type==='safepal'){add(eip6963Map.safepal);add(window.safepalProvider);add(window.safepal?.ethereum);provs.filter(p=>p.isSafePal).forEach(add);if(window.ethereum?.isSafePal)add(window.ethereum)}
  else if(type==='trust'){add(eip6963Map.trust);add(window.trustwallet?.ethereum);add(window.trustwallet);provs.filter(p=>p.isTrust||p.isTrustWallet).forEach(add);if(window.ethereum?.isTrust||window.ethereum?.isTrustWallet)add(window.ethereum)}
  else if(type==='tp'){add(eip6963Map.tp);add(window.tokenpocket?.ethereum);add(window.okxwallet);provs.filter(p=>p.isTokenPocket||p.isOKExWallet).forEach(add)}
  else if(type==='metamask'){add(eip6963Map.metamask);provs.filter(p=>p.isMetaMask&&!p.isSafePal&&!p.isTrust&&!p.isMicrosoft).forEach(add);if(window.ethereum&&!window.ethereum.isMicrosoft)add(window.ethereum)}
  eip6963List.filter(p=>!p.isMicrosoft).forEach(add);provs.filter(p=>!p.isMicrosoft).forEach(add);
  add(window.safepalProvider);add(window.trustwallet?.ethereum);add(window.trustwallet);add(window.tokenpocket?.ethereum);add(window.okxwallet);
  if(window.ethereum)add(window.ethereum);eip6963List.forEach(add);provs.forEach(add);return list;
}
async function ensureBNBNetwork(raw){
  try{
    if(typeof raw.request!=='function')return;
    const cid=await Promise.race([raw.request({method:'eth_chainId'}),new Promise(r=>setTimeout(()=>r(null),1500))]).catch(()=>null);
    if(cid&&parseInt(cid,16)!==56){
      try{await raw.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x38'}]})}
      catch(swErr){if(swErr.code===4902)await raw.request({method:'wallet_addEthereumChain',params:[{chainId:'0x38',chainName:'BNB Smart Chain',nativeCurrency:{name:'BNB',symbol:'BNB',decimals:18},rpcUrls:['https://bsc-dataseed.bnbchain.org/'],blockExplorerUrls:['https://bscscan.com/']}]})}
    }
  }catch(e){}
}
async function connectInjected(type){
  lastWalType=type||'metamask';$('walErrBox').style.display='none';
  const candidates=getCandidateProviders(type);
  if(candidates.length===0){
    if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"")&&['trust','safepal','metamask','tp'].includes(type))return openDeepLink(type);
    return showQrFallbackModal();
  }
  for(const raw of candidates){if(await setupSigner(raw,true,lastWalType))return}
  $('walErrTxt').innerText="Unlock your wallet extension in this browser (or disable conflicting extensions) and click Try Again.";$('walErrBox').style.display='flex';
}
function retryLastWallet(){if(lastWalType==='wc')connectWC();else connectInjected(lastWalType)}
function showQrFallbackModal(){closeMod('walletModal');$('qrFallbackImg').src=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`;openMod('qrFallbackModal')}
function openDeepLink(app){
  const u=encodeURIComponent(window.location.href),hostPath=window.location.href.replace(/^https?:\/\//,'');
  if(app==='safepal')window.location.href=`https://link.safepal.io/dapp?url=${u}`;
  else if(app==='trust')window.location.href=`https://link.trustwallet.com/open_url?coin_id=20000714&url=${u}`;
  else if(app==='metamask')window.location.href=`https://metamask.app.link/dapp/${hostPath}`;
  else if(app==='tp')window.location.href=`tpdapp://open?params=${encodeURIComponent(JSON.stringify({url:window.location.href,chain:'BSC'}))}`;
}
async function connectWC(){
  lastWalType='wc';$('walErrBox').style.display='none';
  const WC=window['@walletconnect/ethereum-provider']?.EthereumProvider||window.EthereumProvider;if(!WC)return showQrFallbackModal();
  try{const wc=await WC.init({projectId:"3a8170812b534d0ff9d794f19a901d64",chains:[56],optionalChains:[56],showQrModal:true});await wc.enable();await setupSigner(wc,true,'wc')}catch(e){showQrFallbackModal()}
}
async function setupSigner(raw,promptUser,wType){
  try{
    let accounts=[];
    if(typeof raw.request==='function')accounts=await Promise.race([raw.request({method:promptUser?'eth_requestAccounts':'eth_accounts'}),new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),promptUser?25000:1800))]).catch(()=>[]);
    if((!accounts||accounts.length===0)&&promptUser&&typeof raw.enable==='function')accounts=await raw.enable().catch(()=>[]);
    if((!accounts||accounts.length===0)&&raw.selectedAddress)accounts=[raw.selectedAddress];
    if((!accounts||accounts.length===0)&&Array.isArray(raw.accounts)&&raw.accounts.length>0)accounts=raw.accounts;
    if(!accounts||accounts.length===0)return false;
    await ensureBNBNetwork(raw);
    const nextAddr=ethers.getAddress(accounts[0]);
    if(userAddr&&userAddr.toLowerCase()!==nextAddr.toLowerCase())resetUserRuntimeFlags();
    provider=new ethers.BrowserProvider(raw,"any");
    signer=await provider.getSigner(nextAddr).catch(()=>provider.getSigner());
    userAddr=nextAddr;proto=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,signer);usdt=new ethers.Contract(ACTIVE_USDT_ADDRESS,ERC20_ABI,signer);
    localStorage.setItem('ghm21_connected_wallet','1');localStorage.setItem('ghm21_wallet_type',wType||'metamask');localStorage.setItem('ghm21_last_addr',userAddr);
    $('walTxt').innerText=userAddr.slice(0,6)+"..."+userAddr.slice(-4);
    $('refLinkIn').value=window.location.origin+window.location.pathname.replace(/index\.html$/,"")+"?ref="+userAddr;
    $('v1AddrIn').value=userAddr;
    $('discBtn').style.display='block';$('walErrBox').style.display='none';
    closeMod('walletModal');closeMod('qrFallbackModal');checkFirstTimePledge(userAddr);syncV1Visibility();
    if(raw.on)raw.on('accountsChanged',accs=>{resetUserRuntimeFlags();if(accs&&accs.length>0)setupSigner(raw,false,wType);else disconnectWal()});
    refreshAll(true);return true;
  }catch(e){return false}
}
function disconnectWal(){
  userAddr="";signer=null;proto=null;resetUserRuntimeFlags();
  localStorage.removeItem('ghm21_connected_wallet');localStorage.removeItem('ghm21_wallet_type');localStorage.removeItem('ghm21_last_addr');
  $('walTxt').innerText="Connect";$('myPosTxt').innerText="Not Connected";$('myRemTxt').innerText="$0.00";$('myRecTxt').innerText="$20.00";
  $('discBtn').style.display='none';$('monBtn').style.display='none';$('mobMonBtn').style.display='none';$('dCertRow').style.display='none';
  syncV1Visibility();updateVaultBoosterAndReliefUI();closeMod('walletModal');syncDockUI();
}

async function ensureAllowance(reqWei,btnEl){
  const rp=await getRProv(),rUsdt=new ethers.Contract(ACTIVE_USDT_ADDRESS,ERC20_ABI,rp);
  const cur=await rUsdt.allowance(userAddr,GHM21_PROTOCOL_ADDRESS).catch(()=>0n);
  if(cur<reqWei){
    const minPass=ethers.parseEther("200"),tripleReq=reqWei*3n,approveWei=tripleReq>minPass?tripleReq:minPass;
    if(btnEl)btnEl.innerText="1/2 Approve Cycle Pass...";
    let txPromise;
    try{txPromise=usdt.approve(GHM21_PROTOCOL_ADDRESS,approveWei,{gasLimit:90000n})}
    catch(_){const data=new ethers.Interface(ERC20_ABI).encodeFunctionData("approve",[GHM21_PROTOCOL_ADDRESS,approveWei]);txPromise=signer.sendTransaction({to:ACTIVE_USDT_ADDRESS,data,gasLimit:90000n})}
    if(btnEl)btnEl.innerText="Approving Cycle Pass...";
    const pollAllowance=async()=>{for(let i=0;i<65;i++){await new Promise(r=>setTimeout(r,350));const p=await getRProv(),cU=new ethers.Contract(ACTIVE_USDT_ADDRESS,ERC20_ABI,p),updated=await cU.allowance(userAddr,GHM21_PROTOCOL_ADDRESS).catch(()=>0n);if(updated>=reqWei)return true}return false};
    const tx=await Promise.race([withWalletTimeout(txPromise).catch(e=>{if(!isCoalesceOrRpcErr(e))throw e;return null}),pollAllowance().then(ok=>ok?{alreadyMined:true}:null)]);
    if(tx&&!tx.alreadyMined)await Promise.race([waitTxFast(tx).catch(()=>null),pollAllowance()]);
    return true;
  }
  return false;
}

async function notifyRankUpgradesFromLogs(receipt){
  try{
    const iface=new ethers.Interface(PROTO_ABI);
    for(const log of(receipt?.logs||[])){
      try{
        const p=iface.parseLog(log);
        if(p&&p.name==="RankUpgraded"){
          const rNode=p.args.node,rLabel=RANK_NAMES[Number(p.args.newRank)]||'Leader';
          tgPost(MAIN_CHANNEL,`🏆 *Leadership Rank Promotion!*\nNode \`${rNode.slice(0,6)}...${rNode.slice(-4)}\` has officially achieved *${rLabel}* Rank and unlocked their Official On-Chain Leadership Certificate!`);
          const rInfo=await callNodeSafe(rNode,0);
          const lTg=rInfo?rInfo.tg:"";
          if(lTg)sendPrivateTg(lTg,`🏆 *Congratulations! You Ranked Up to ${rLabel}!*\nYour node \`${rNode}\` has officially qualified on-chain!\n\n📜 Open your *Personal Node Dashboard* on GHM21 and tap *Official Certificate* to download your verified Leadership Certificate!`);
        }
      }catch(e){}
    }
  }catch(e){}
}

async function executePH(){
  if(!userAddr)return openMod('walletModal');if(isTxBusy||isUserInL1)return;
  if(unregisteredRefWarningPending&&(myTotalPH+myTotalGH)===0)return openMod('badRefModal');
  const v=Number($('phInput').value)||0,isPull=eligPullL1&&(v===10),isRec=!isPull&&eligRecommit&&(v===expRecommit)&&((myTotalPH+myTotalGH)>0),maxAllowed=currentVolNum>=2100000?10000:5000;
  if(!isRec&&!isPull){
    if(eligRecommit&&myPendingBal===0){$('phInput').value=expRecommit;syncDockUI();return alert(`Please complete your Step ${myCycleStep}/3 Recommitment ($${expRecommit.toFixed(2)}) before starting a new cycle!`)}
    const now=Math.floor(Date.now()/1000);
    if(pullCdExp>now&&v===10)return alert(`⏳ Pull L2 Cooldown Active! You can pull again in ${fmtDur(pullCdExp-now)}.`);
    if(v<20||v%10!==0)return alert("Fresh cycle donations must be at least $20 USDT in multiples of $10.");
    if(v>maxAllowed)return alert(`Maximum Provide Help limit is $${maxAllowed.toLocaleString()} USDT.`);
    if((myTotalPH+myTotalGH)>0&&myCeiling>0&&v>myCeiling)return alert(`2.5x Anti-Whale Ceiling: Your maximum allowed tier for this cycle is $${myCeiling.toFixed(2)} USDT.`);
    localStorage.setItem('ghm21_ph_'+C_PREF,String(v));
  }
  const baseWei=ethers.parseEther(v.toString()),totWei=isPull?(baseWei+ethers.parseEther("0.25")):(isRec?(baseWei+(baseWei*5n)/100n):baseWei),btn=$('phBtn');
  try{
    isTxBusy=true;btn.disabled=true;btn.classList.remove('blink');
    const rp=await getRProv(),rUsdt=new ethers.Contract(ACTIVE_USDT_ADDRESS,ERC20_ABI,rp),uBal=await rUsdt.balanceOf(userAddr).catch(()=>0n);
    if(uBal<totWei){isTxBusy=false;syncDockUI();return alert(`Insufficient USDT balance! You need $${Number(ethers.formatEther(totWei)).toFixed(2)} USDT in your wallet.`)}
    const didApprove=await ensureAllowance(totWei,btn);
    btn.innerText="Confirm in Wallet...";
    const savedRef=localStorage.getItem(REF_KEY)||OPS_WALLET;
    let tx;
    try{
      if(isPull)tx=await sendContractTx(proto,"pullL2",[]);
      else if(isRec)tx=await sendContractTx(proto,"recommit",[baseWei]);
      else tx=await sendContractTx(proto,"provideHelp",[baseWei,savedRef]);
    }catch(innerErr){if(didApprove){isTxBusy=false;needManualConfirm=true;syncDockUI();return}throw innerErr}
    needManualConfirm=false;userTypedCustom=false;localStorage.removeItem('ghm21_ph_'+C_PREF);btn.innerText="Confirming...";
    const receipt=await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();syncDockUI();
    if(myTgId){const actName=isPull?"Pull L2 ($10.25)":(isRec?"50% Recommitment (140% Listed)":"Provide Help");sendPrivateTg(myTgId,`✅ *GHM21 ${actName} Confirmed!*\nAmount Paid: *$${Number(ethers.formatEther(totWei)).toFixed(2)} USDT*\nStatus: Listed at *Lane 1 Position #1*!`)}
    await notifyRankUpgradesFromLogs(receipt);
    const iface=new ethers.Interface(PROTO_ABI);
    for(const log of(receipt?.logs||[])){
      try{
        const p=iface.parseLog(log);
        if(p&&p.name==="MilestoneReached"){const mT=Number(p.args.milestoneType),mV=p.args.milestoneValue;tgPost(MAIN_CHANNEL,mT===1?`🔥 *GHM21 Volume Milestone Achieved!*\nTotal Protocol Volume surpassed *$${Number(ethers.formatEther(mV)).toLocaleString()} USDT*! Code is Law!`:`🎉 *GHM21 Community Growth Milestone!*\nWe have officially reached *${Number(mV)}+ Registered Nodes* on-chain! 🚀`)}
        else if(p&&p.name==="PayoutDispatched"){
          const sA=p.args.seeker,pay=Number(ethers.formatEther(p.args.payoutAmount)).toFixed(2),rem=Number(ethers.formatEther(p.args.remainingBalance)).toFixed(2),ln=Number(p.args.lane);
          const sInfo=await callNodeSafe(sA,0);
          if(sInfo&&sInfo.tg)sendPrivateTg(sInfo.tg,`💸 *GHM21 Payout Received (Lane ${ln})!*\nYou received: *$${pay} USDT*\nRemaining Balance: *$${rem} USDT*`);
        }
      }catch(e){}
    }
    refreshAll(true);
  }catch(e){
    isTxBusy=false;
    nodeMemCache.delete(userAddr.toLowerCase());
    const nNow=await callNodeSafe(userAddr,0);
    if(nNow&&nNow.n.hasPendingLOH){lohPending=true;refreshAll(true);return alert("🎉 Good news! You just received a payout while confirming—please submit your Letter of Happiness first!")}
    syncDockUI();alertPublicErr(e,"Transaction Notice","Action unavailable right now. Check your balance, active step, or pending LOH.");
  }
}

async function claimMgrPool(btnEl){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  if(!canClaimMgr)return alert("👑 24-Hour Active Manager Pool Eligibility:\n1. Hold verified Manager Rank (Rank 3).\n2. Maintain an active running PH cycle with tasks cleared and no pending LOH.\n3. Claim once per calendar day at any time.");
  const orig=btnEl?btnEl.innerText:"👑 Claim 24h Share";
  try{
    isTxBusy=true;if(btnEl){btnEl.disabled=true;btnEl.innerText="Claiming..."}
    const estShare=(mgrPoolTotal/Math.max(1,mgrShareDivisor)).toFixed(2);
    const tx=await sendContractTx(proto,"claimManagerPool",[]);
    await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    tgPost(MAIN_CHANNEL,`👑 *24-Hour Active Manager Pool Claimed!*\nManager \`${userAddr.slice(0,6)}...${userAddr.slice(-4)}\` just claimed their daily Manager Pool share (*~$${estShare} USDT*) directly from the Safety Net Vault!`);
    if(myTgId)sendPrivateTg(myTgId,`👑 *24h Manager Pool Claimed!*\nYour daily Manager share (*~$${estShare} USDT*) has been sent directly to your wallet!`);
    alert(`✅ Claimed your 24-Hour Manager Pool share (~$${estShare} USDT) directly to your wallet!`);
    refreshAll(true);
  }catch(e){
    isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=orig}
    alertPublicErr(e,"Manager Pool Notice","Unable to claim right now. Ensure the Safety Net Vault is linked in Monitor, your Manager node has an active running PH cycle, no pending LOH, and has not already claimed today.");
  }
}

async function claimPts(){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  if(myPts<10)return alert("Accumulate at least 10 Task Points ($10 USDT) to claim.");
  const ptsToClaim=myPts;
  try{
    isTxBusy=true;const tx=await sendContractTx(proto,"claimTaskPoints",[]);await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    tgPost(MAIN_CHANNEL,`🌟 *Task Rewards Claimed!*\nPerformer \`${userAddr.slice(0,6)}...${userAddr.slice(-4)}\` just claimed *$${ptsToClaim}.00 USDT (${ptsToClaim} Task Points)* into the payout queue from performing community tasks!`);
    if(myTgId)sendPrivateTg(myTgId,`🌟 *Task Points Claimed!*\n*$${ptsToClaim}.00 USDT* has been added directly to your payout queue balance!`);
    alert(`✅ Claimed $${ptsToClaim}.00 USDT into your Lane 2 payout balance!`);refreshAll(true);
  }catch(e){isTxBusy=false;alertPublicErr(e,"Claim Notice","Ensure your node is active with no pending LOH.")}
}

async function pauseActiveSlot(){
  if(!userAddr||isTxBusy)return;
  const now=Math.floor(Date.now()/1000);if(pullCdExp>now)return alert(`⏳ Slot Cooldown Active: Please wait ${fmtDur(pullCdExp-now)} before pausing.`);
  const btn=$('pauseSlotBtn');
  try{
    isTxBusy=true;btn.disabled=true;btn.innerText="Pausing...";
    const tx=await sendContractTx(proto,"pauseSlot",[]);await waitTxFast(tx);
    isTxBusy=false;nodeMemCache.clear();cachedParkedKey="";btn.disabled=false;btn.innerText="⏸️ Pause Slot";refreshAll(true);
  }catch(e){isTxBusy=false;btn.disabled=false;btn.innerText="⏸️ Pause Slot";alertPublicErr(e,"Pause Notice","Only active running PH slots in Lane 2 can be paused.")}
}
async function resumeSlot(idx){
  if(!userAddr||isTxBusy)return;
  try{isTxBusy=true;const tx=await sendContractTx(proto,"resumeSlot",[idx]);await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();cachedParkedKey="";refreshAll(true)}
  catch(e){isTxBusy=false;alertPublicErr(e,"Resume Notice","Finish your current active queue balance before resuming a parked slot.")}
}

function unpackCompData(r5Val){const cBig=BigInt(r5Val||0n)>>128n;return{status:Number(cBig&7n),snapDir:Number((cBig>>3n)&65535n),snapPil:Number((cBig>>19n)&255n),snapVol:Number((cBig>>27n)&0xFFFFFFFFFFFFFFFFn)}}
function unpackR4Meta(r4Val){const r4Big=BigInt(r4Val||0n);return{audHex:"0x"+(r4Big>>96n).toString(16).padStart(40,"0"),lastAct:Number((r4Big>>64n)&0xFFFFFFFFn),mCnt:Number((r4Big>>32n)&0xFFFFFFFFn),canM:((r4Big>>31n)&1n)===1n,l2Cnt:Number((r4Big>>26n)&31n),cycNum:Number((r4Big>>16n)&1023n)||1,grantUsd:Number(r4Big&0xFFFFn)}}
function unpackR6Meta(r6Val){const r6Big=BigInt(r6Val||0n),M64=(1n<<64n)-1n,M128=(1n<<128n)-1n;return{mgrPoolUsd:Number((r6Big>>192n)&M64)/1e6,compPrizeUsd:Number((r6Big>>128n)&M64)/1e6,v1PaidUsd:Number(ethers.formatEther(r6Big&M128))}}

function updateMgrPoolUI(){
  const share=mgrPoolTotal/Math.max(1,mgrShareDivisor);
  $('dMgrPoolTxt').innerText=`$${mgrPoolTotal.toFixed(2)} USDT`;$('vMgrPoolTxt').innerText=`$${mgrPoolTotal.toFixed(2)} USDT`;
  const sub=totalMgrCount>0?`Managers: ${totalMgrCount} • Daily Share: $${share.toFixed(2)} / Mgr`:`Managers: 0 • Pool Accumulating ($${mgrPoolTotal.toFixed(2)})`;
  $('dMgrSubTxt').innerText=sub;$('vMgrSubTxt').innerText=sub;
  const b1=$('dClaimMgrBtn'),b2=$('vClaimMgrBtn'),lbl=canClaimMgr?`👑 Claim $${share.toFixed(2)}`:`👑 Claim 24h Share`;
  b1.disabled=!canClaimMgr;b2.disabled=!canClaimMgr;b1.innerText=lbl;b2.innerText=lbl;
}
function updateVaultBoosterAndReliefUI(){
  const now=Math.floor(Date.now()/1000);
  if(lastActTime>0&&$('netModeBadge')){
    const ago=Math.max(0,now-lastActTime);
    const actStr=ago<90?"Just now":(ago<3600?`${Math.floor(ago/60)}m ago`:(ago<86400?`${Math.floor(ago/3600)}h ago`:`${Math.floor(ago/86400)}d ago`));
    $('netModeBadge').innerText=`⚡ Act: ${actStr} • BNB`;
  }
  let wave=boosterPoolTotal/5;
  if(wave<10)wave=boosterPoolTotal>10?10:boosterPoolTotal;
  if(wave>100)wave=100;
  if($('vBoostPoolTxt'))$('vBoostPoolTxt').innerText=`$${boosterPoolTotal.toFixed(2)} USDT`;
  const waitAct=Math.max(0,(lastActTime+43200)-now),waitBoost=Math.max(0,(lastBoostTimeOnChain+43200)-now),waitSec=Math.max(waitAct,waitBoost);
  const inDormant=lastActTime>0&&now>=(lastActTime+7776000);
  const hasQueue=queueCache.l1.length>0||l2TotalWaiting>0||activeL2CountOnChain>0;
  const readyBoost=lastActTime>0&&waitSec===0&&!inDormant&&boosterPoolTotal>0.009&&hasQueue;
  if($('vBoostSubTxt')){
    if(boosterPoolTotal<=0.009)$('vBoostSubTxt').innerText="Accumulating from Matrix & Overflow leftovers ($0.00)";
    else if(inDormant)$('vBoostSubTxt').innerText="Paused (90-Day Relief Window Active)";
    else if(!hasQueue)$('vBoostSubTxt').innerText=`Next Wave: $${wave.toFixed(2)} • Queue Empty ✓`;
    else if(waitSec>0)$('vBoostSubTxt').innerText=`Next Wave: $${wave.toFixed(2)} • Unlocks in ${fmtDur(waitSec)}`;
    else $('vBoostSubTxt').innerText=`🟢 Ready! Next Wave: $${wave.toFixed(2)} ($10 Rescue Slices)`;
  }
  const bBtn=$('vBoostBtn');
  if(bBtn&&!isTxBusy){
    bBtn.disabled=!readyBoost;
    bBtn.innerText=readyBoost?`⚡ Boost $${wave.toFixed(2)}`:"⚡ Boost Queue";
  }
  const myProtDef=Math.max(0,(myTotalPH*0.85)-myTotalGH);
  const unlockAt=lastActTime+7776000,closeAt=unlockAt+2592000,inRelWin=lastActTime>0&&now>=unlockAt&&now<=closeAt;
  const rTxt=$('vMyReliefTxt'),rBtn=$('vReliefBtn');
  if(rTxt){
    if(!userAddr){rTxt.innerText="Connect Wallet";rTxt.style.color="var(--muted)"}
    else if(myReliefClaimed){rTxt.innerText="Claimed ✓ ($0.00 Remaining)";rTxt.style.color="var(--green)"}
    else if(myProtDef<=0.005){rTxt.innerText="$0.00 (In Profit ✓)";rTxt.style.color="var(--green)"}
    else{rTxt.innerText=`$${myProtDef.toFixed(2)} • Est. Payout: $${myEstReliefUsd.toFixed(2)} USDT`;rTxt.style.color="var(--green)"}
  }
  if(rBtn&&!isTxBusy){
    if(userAddr&&myReliefClaimed&&inRelWin){rBtn.innerText="Relief Claimed ✓";rBtn.disabled=true}
    else if(userAddr&&inRelWin&&myEstReliefUsd>0){rBtn.innerText=`Claim $${myEstReliefUsd.toFixed(2)} Relief`;rBtn.disabled=false}
    else{rBtn.innerText="Claim 90-Day Relief";rBtn.disabled=false}
  }
}

async function fetchCardSafe(a,idx,posNum){
  const res=await callNodeSafe(a,idx);if(!res)return null;const {n,e}=res;
  return{pos:posNum||(idx+1),addr:a.slice(0,6)+"..."+a.slice(-4),full:a,rIcon:RANK_ICONS[Number(e.rank||0)]||"👤",ph:Number(ethers.formatEther(n.totalPHProvided||0n)),gh:Number(ethers.formatEther(n.totalGHReceived||0n)),rem:Number(ethers.formatEther(n.pendingBalance||0n))};
}
async function onSearchQueue(val){
  const q=(val||"").toLowerCase().trim();if(!q){searchedL2Cards=null;renderMarketplace();return}
  const matches=[];l2FullAddrs.forEach((a,idx)=>{if(a.toLowerCase().includes(q))matches.push({a,pos:idx+1})});
  if(matches.length===0){searchedL2Cards=[];renderMarketplace();return}
  searchedL2Cards=(await Promise.all(matches.slice(0,VISIBLE_L2_CAP).map((m,i)=>fetchCardSafe(m.a,i,m.pos)))).filter(Boolean);renderMarketplace();
}

async function refreshAll(forceNow=false){
  if(!forceNow&&document.hidden)return;if(isRefreshing&&!forceNow)return;isRefreshing=true;
  try{
    if(forceNow)nodeMemCache.delete((userAddr||OPS_WALLET).toLowerCase());
    const rp=await getRProv(),rProto=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,rp);
    syncSocialConfigFromChain(false);
    let qOk=true;
    const [qL1,qL2,baseInfo]=await Promise.all([
      rProto.getAddressSlice(4,0,3).catch(()=>{qOk=false;return null}),
      rProto.getAddressSlice(5,0,60).catch(()=>{qOk=false;return null}),
      callNodeSafe(userAddr||OPS_WALLET,0)
    ]);
    if(baseInfo){
      applyNetworkAndSocialLinks(baseInfo.e.isLive,baseInfo.uTok);
      const t=baseInfo.t,r0Big=BigInt(t[0]||0n);
      mgrShareDivisor=Math.max(1,Number((r0Big>>28n)&511n));
      curCompPreset=Number((r0Big>>37n)&15n)||1;
      curCompActive=((r0Big>>41n)&1n)===1n;
      curCompId=Number((r0Big>>42n)&65535n)||1;
      v1WindowOpen=((r0Big>>100n)&1n)===1n;
      curCompMeta=baseInfo.compMeta||curCompMeta;
      totalTaskCount=Number(BigInt(t[3]||0n)>>128n);
      currentVolNum=Number(ethers.formatEther(BigInt(t[2]||0n)>>128n));
      const meta4=unpackR4Meta(t[4]);
      if(meta4.audHex&&ethers.isAddress(meta4.audHex))activeAuditorWallet=ethers.getAddress(meta4.audHex);
      lastActTime=meta4.lastAct;totalMgrCount=meta4.mCnt;activeL2CountOnChain=meta4.l2Cnt;
      boosterPoolTotal=baseInfo.boosterPoolUsd||0;lastBoostTimeOnChain=baseInfo.lastBoostTs||0;
      mgrPoolTotal=unpackR6Meta(t[6]).mgrPoolUsd;updateMgrPoolUI();updateVaultBoosterAndReliefUI();
      $('volDisplay').innerText=currentVolNum.toLocaleString('en-US',{minimumFractionDigits:2})+" USDT";
    }
    const rUsdt=new ethers.Contract(ACTIVE_USDT_ADDRESS,ERC20_ABI,rp);
    const vBal=await rUsdt.balanceOf(SAFETY_VAULT_ADDRESS).catch(()=>null);
    let vBalStr=$('vBalTxt').innerText;
    if(vBal!==null){vBalStr=Number(ethers.formatEther(vBal)).toFixed(2)+" USDT";$('vBalTxt').innerText=vBalStr}

    let l1A=qL1?(qL1.list||[]):[],l2A=qL2?(qL2.list||[]):[];
    if(qOk&&qL1&&qL2){
      l2FullAddrs=l2A;l2TotalWaiting=l2A.length;
      const topL2Slice=l2A.slice(0,VISIBLE_L2_CAP);
      const [l1C,l2C]=await Promise.all([
        Promise.all(l1A.slice(0,1).map((a,i)=>fetchCardSafe(a,i,i+1))),
        Promise.all(topL2Slice.map((a,i)=>fetchCardSafe(a,i+1,i+1)))
      ]);
      const cleanL1=l1C.filter(Boolean),cleanL2=l2C.filter(Boolean);
      if(cleanL1.length===l1A.slice(0,1).length&&cleanL2.length===topL2Slice.length)queueCache={l1:cleanL1,l2:cleanL2};
      const curQ=($('searchIn').value||"").trim();if(curQ)await onSearchQueue(curQ);
    }

    if(userAddr){
      const uLow=userAddr.toLowerCase();
      let i1=l1A.findIndex(a=>a.toLowerCase()===uLow),i2=l2A.findIndex(a=>a.toLowerCase()===uLow);
      const uInfo=(userAddr.toLowerCase()===(OPS_WALLET).toLowerCase()&&baseInfo)?baseInfo:(baseInfo&&userAddr?baseInfo:await callNodeSafe(userAddr,0));
      if(uInfo){
        const {n,e,t,tg}=uInfo,MASK128=(1n<<128n)-1n;
        myTotalPH=Number(ethers.formatEther(n.totalPHProvided||0n));myTotalGH=Number(ethers.formatEther(n.totalGHReceived||0n));myPendingBal=Number(ethers.formatEther(n.pendingBalance||0n));
        const curRank=Number(e.rank||0),dirCnt=Number(e.directCount||0n),dirVol=Number(ethers.formatEther(e.directVolume||0n)),verPil=Number(e.verifiedPillarsCount||0);
        myRank=curRank;myDirects=dirCnt;myTeamVol=dirVol;myVerPillars=verPil;
        isUserInL1=(i1!==-1)||(Number(e.currentLane||0)===1&&myPendingBal>0);isUserInL2=(i2!==-1)||(Number(e.currentLane||0)===2&&myPendingBal>0);
        if(isUserInL1&&queueCache.l1.length===0&&myPendingBal>0)queueCache.l1=[{pos:1,addr:userAddr.slice(0,6)+"..."+userAddr.slice(-4),full:userAddr,rIcon:RANK_ICONS[curRank]||"👤",ph:myTotalPH,gh:myTotalGH,rem:myPendingBal}];
        $('myPosTxt').innerText=isUserInL1?`#${i1!==-1?i1+1:1} (L1)`:(i2!==-1?`#${i2+1} (L2)`:(isUserInL2?"Lane 2":"Idle"));

        const r0=BigInt(t[0]||0n),isCycleCleared=(r0&1n)!==0n,canRecFlag=(r0&32n)!==0n,canPullFlag=(r0&64n)!==0n;
        myPillarsMask=Number((r0>>1n)&15n);userIsVerifier=(r0&128n)!==0n;myPts=Number((r0>>8n)&65535n);myPendingPillarsMask=Number((r0>>24n)&15n);
        myParkedLen=Number((r0>>58n)&63n);myTxLen=Number((r0>>64n)&0xFFFFFFFFn);myWaivedMask=Number((r0>>96n)&15n);
        v1WindowOpen=((r0>>100n)&1n)===1n;myV1Status=Number((r0>>101n)&3n);myReliefClaimed=((r0>>103n)&1n)===1n;
        myEstReliefUsd=uInfo.estReliefUsd||0;myNodeActive=Boolean(n.isActive);
        boosterPoolTotal=uInfo.boosterPoolUsd??boosterPoolTotal;lastBoostTimeOnChain=uInfo.lastBoostTs??lastBoostTimeOnChain;

        myLastPayout=Number(ethers.formatEther(BigInt(t[2]||0n)&MASK128));
        const r3Big=BigInt(t[3]||0n);totalTaskCount=Number(r3Big>>128n);myJoinedAt=Number(r3Big&MASK128);
        const meta4=unpackR4Meta(t[4]);myGrantVal=meta4.grantUsd;totalMgrCount=meta4.mCnt;canClaimMgr=meta4.canM;activeL2CountOnChain=meta4.l2Cnt;myCurCycleNum=meta4.cycNum||1;
        const r5Big=BigInt(t[5]||0n),cUnpacked=unpackCompData(r5Big);
        myCompStatus=cUnpacked.status;mySnapDir=cUnpacked.snapDir;mySnapPil=cUnpacked.snapPil;mySnapVol=cUnpacked.snapVol;myV1Def=Number(ethers.formatEther(r5Big&MASK128));
        const meta6=unpackR6Meta(t[6]);mgrPoolTotal=meta6.mgrPoolUsd;myCompPrize=meta6.compPrizeUsd;updateMgrPoolUI();

        const isOps=(uLow===OPS_WALLET.toLowerCase()),isMonitorAdmin=[activeAuditorWallet.toLowerCase(),OPS_WALLET.toLowerCase()].includes(uLow);
        $('monBtn').style.display=isMonitorAdmin?'inline-block':'none';$('mobMonBtn').style.display=isMonitorAdmin?'block':'none';
        $('opsOnlyPanel').style.display=isOps?'flex':'none';$('opsSweepBtn').style.display=isOps?'inline-block':'none';
        $('compAdminPanel').style.display=isMonitorAdmin?'flex':'none';
        if($('socialAdminBox'))$('socialAdminBox').style.display=isMonitorAdmin?'flex':'none';
        if($('testnetSimRow'))$('testnetSimRow').style.display=(isOps&&!IS_LIVE_USDT)?'flex':'none';

        const savedRef=localStorage.getItem(REF_KEY)||OPS_WALLET;
        mySponsorAddr=(n.upliner&&n.upliner!==ethers.ZeroAddress)?n.upliner:savedRef;
        $('dSponsorTxt').innerText=mySponsorAddr.slice(0,6)+"..."+mySponsorAddr.slice(-4)+(n.isActive?" (Locked)":" (Pending PH)");
        if($('tasksModal').style.display==='flex')syncPillarDropdownLocks();
        syncV1Visibility();$('dCertRow').style.display=curRank>=1?'flex':'none';

        let pendPilCnt=0;for(let b=0;b<4;b++)if((myPendingPillarsMask&(1<<b))!==0)pendPilCnt++;
        const pendTag=pendPilCnt>0?` (${pendPilCnt} Pending ⏳)`:"",rNextEl=$('dRankNextLbl'),rProgEl=$('dRankProgTxt');
        if(curRank===0){rNextEl.innerText="🏆 Next Rank (🧭 Guider):";rProgEl.innerText=`Directs: ${dirCnt}/${RANK_REQS.r1d} • Team Vol: $${dirVol.toLocaleString('en-US',{maximumFractionDigits:0})}/$${RANK_REQS.r1v.toLocaleString('en-US')} • Pillars: ${verPil}/1${pendTag}`}
        else if(curRank===1){rNextEl.innerText="🏆 Next Rank (🏅 Leader):";rProgEl.innerText=`Directs: ${dirCnt}/${RANK_REQS.r2d} • Team Vol: $${dirVol.toLocaleString('en-US',{maximumFractionDigits:0})}/$${RANK_REQS.r2v.toLocaleString('en-US')} • Pillars: ${verPil}/2${pendTag}`}
        else if(curRank===2){rNextEl.innerText="🏆 Next Rank (👑 Manager):";rProgEl.innerText=`Directs: ${dirCnt}/${RANK_REQS.r3d} • Team Vol: $${dirVol.toLocaleString('en-US',{maximumFractionDigits:0})}/$${RANK_REQS.r3v.toLocaleString('en-US')} • Pillars: ${verPil}/3${pendTag}`}
        else{rNextEl.innerText="👑 Top Rank Achieved:";rProgEl.innerText=`Directs: ${dirCnt} • Team Vol: $${dirVol.toLocaleString('en-US',{maximumFractionDigits:0})} • Pillars: ${verPil}${pendTag}`}

        const canClaimPts=myPts>=10&&!n.hasPendingLOH&&n.isActive&&(myTotalPH+myTotalGH)>0&&myGrantVal===0;
        $('dPtsTxt').innerText=`${myPts} pts ($${myPts}.00)`;$('tPtsTxt').innerText=`${myPts} pts ($${myPts}.00)`;
        const dCB=$('dClaimPtsBtn'),tCB=$('tClaimPtsBtn');dCB.disabled=!canClaimPts;tCB.disabled=!canClaimPts;dCB.innerText=`Claim $${myPts} to Queue`;tCB.innerText=`Claim $${myPts} to Queue`;

        const myTier=Number(ethers.formatEther(n.currentTier||0n));myTgId=String(tg||"").trim();myCycleStep=Number(n.cycleStep||1n);
        const baseT=Number(ethers.formatEther(e.originalBaselineTier||0n))||myTier||20,unlockedB=Number(ethers.formatEther(e.maxUnlockedBase||0n))||baseT;
        const dispTier=(myCycleStep===1&&myPendingBal===0&&(myTotalPH+myTotalGH)>0)?baseT:myTier,maxSys=currentVolNum>=2100000?10000:5000;
        myCeiling=(myTotalPH+myTotalGH)>0&&unlockedB>0?Math.min(maxSys,unlockedB*2.5):maxSys;

        const gB=$('grantBanner');
        if(myGrantVal>0){gB.style.display='flex';$('grantTitle').innerText=`🎁 Pioneer Grant Ready: $${myGrantVal.toFixed(0)} USDT`;$('grantDesc').innerText=`Donate $20+ to revive & merge +$${(myGrantVal*0.65).toFixed(2)} seeking into Lane 1!`}else gB.style.display='none';

        const wasRec=eligRecommit,wasPull=eligPullL1,rawSlot1=t[1]||20000000000000000000n;
        eligRecommit=canRecFlag&&(myTotalPH+myTotalGH)>0;eligPullL1=canPullFlag;
        if(rawSlot1>0n&&rawSlot1<1000000000000n){pullCdExp=Number(rawSlot1);expRecommit=Math.max(10,baseT/2)}else{pullCdExp=0;expRecommit=Number(ethers.formatEther(rawSlot1))||20}
        lohPending=Boolean(n.hasPendingLOH);cooldownExp=Number(n.cooldownExpiry||0n);actWinExp=Number(e.activeWindowExpiry||0n);

        const phIn=$('phInput'),savedPendingAmt=Number(localStorage.getItem('ghm21_ph_'+C_PREF)||0);
        if(!isTxBusy&&document.activeElement!==phIn&&!needManualConfirm){
          if(eligRecommit&&(myPendingBal===0||!wasRec)){phIn.value=expRecommit;userTypedCustom=false}
          else if(eligPullL1&&(!wasPull||!userTypedCustom))phIn.value=10;
          else if(eligRecommit&&!eligPullL1&&!userTypedCustom)phIn.value=expRecommit;
          else if(!eligRecommit&&!eligPullL1){if(savedPendingAmt>=20&&savedPendingAmt%10===0)phIn.value=savedPendingAmt;else if(Number(phIn.value)<20)phIn.value=20}
        }
        const now=Math.floor(Date.now()/1000);
        $('myRemTxt').innerText=`$${myPendingBal.toFixed(2)}`;
        if(eligRecommit&&myPendingBal===0)$('myRecTxt').innerText=`$${expRecommit.toFixed(2)} Rec`;
        else if(eligPullL1)$('myRecTxt').innerText=`Pull L2 ($10.25)`;
        else if(eligRecommit)$('myRecTxt').innerText=`$${expRecommit.toFixed(2)} Rec`;
        else if(pullCdExp>now)$('myRecTxt').innerText=`Pull CD: ${fmtDur(pullCdExp-now)}`;
        else if((myTotalPH+myTotalGH)===0)$('myRecTxt').innerText=`$20+ Fresh PH`;
        else $('myRecTxt').innerText=`$${expRecommit.toFixed(2)}`;

        $('dActiveSlot').innerText=`C${myCurCycleNum} • $${dispTier} (Step ${myCycleStep}/3)`;$('dPending').innerText=`$${myPendingBal.toFixed(2)}`;$('dRank').innerText=RANK_NAMES[curRank];
        $('dTotPH').innerText=`$${myTotalPH.toFixed(2)}`;$('dTotGH').innerText=`$${myTotalGH.toFixed(2)}`;$('dCeiling').innerText=`$${myCeiling.toFixed(2)}`;
        $('dCycleClear').innerText=isCycleCleared?"Cleared ✓":"Task Needed ⚠️";
        if(myTgId&&document.activeElement!==$('tgInput'))$('tgInput').value=getDisplayTg(myTgId);
        $('pauseSlotBtn').style.display=(!isUserInL1&&!lohPending&&myPendingBal>0&&cooldownExp===0)?'inline-block':'none';
        const dL=$('dLohBtn');if(lohPending)dL.classList.add('blink');else dL.classList.remove('blink');
        const dT=$('dTaskBtn');if((myTotalPH+myTotalGH)>0&&!isCycleCleared)dT.classList.add('blink');else dT.classList.remove('blink');

        const canRes=myPendingBal===0&&!e.isInQueue&&!lohPending;
        if(myParkedLen>0){
          const pCacheKey=`${uLow}_${myParkedLen}_${myTxLen}_${canRes?1:0}`;
          if(cachedParkedKey!==pCacheKey||forceNow){
            const pIdxs=[];for(let pi=0;pi<myParkedLen;pi++)pIdxs.push(pi);
            const pRecs=await Promise.all(pIdxs.map((pi,idx)=>new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,getRpcAt(idx)).getRecord(userAddr,pi,true).catch(()=>null)));
            cachedParkedHtml=pRecs.map((rec,idx)=>{
              if(!rec)return "";
              const tierVal=ethers.formatEther(rec[0]||0n),remVal=Number(ethers.formatEther(rec[1]||0n)),cPacked=Number(rec[2]||0n),isParked=(cPacked&1)!==0,cStep=cPacked>>8;
              return (isParked&&remVal>0)?`<div class="m-row" style="padding:5px 7px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px"><span><b>Slot #${idx+1}:</b> $${tierVal} • Step ${cStep}/3 • Rem: <b style="color:var(--green)">$${remVal.toFixed(2)}</b></span><button class="btn-sm" ${canRes?'':'disabled style="opacity:0.4"'} onclick="resumeSlot(${idx})">▶ Resume</button></div>`:"";
            }).filter(Boolean).join("")||"None";
            cachedParkedKey=pCacheKey;
          }
          $('dParkedList').innerHTML=cachedParkedHtml;
        }else{cachedParkedKey="";cachedParkedHtml="None";$('dParkedList').innerHTML="None"}
        if(myTgId&&!sessionStorage.getItem('ghm21_login_'+uLow)){sessionStorage.setItem('ghm21_login_'+uLow,'1');sendPrivateTg(myTgId,`🛡️ *GHM21 Private Login Alert*\nWallet: \`${userAddr}\`\nPending Balance: *$${myPendingBal.toFixed(2)} USDT*`)}
        syncDockUI();
      }
    }
    renderMarketplace();updateVaultBoosterAndReliefUI();saveCacheSnapshot(vBalStr);if(forceNow)autoRefreshOpenModals();
  }catch(e){await getRProv(true)}
  isRefreshing=false;
}

function autoRefreshOpenModals(){
  if(isTxBusy||document.hidden)return;
  if($('feedModal').style.display==='flex')loadFeed(true);
  if($('compModal').style.display==='flex')loadCompetitions(null,false);
  if($('monModal').style.display==='flex')loadMonitor(null,true);
  if($('dashModal').style.display==='flex'){loadTxHistory(null);loadL1ToL9(null,false)}
}

function renderMarketplace(){
  const l1El=$('lane1Container');
  if(queueCache.l1.length===0)l1El.innerHTML=`<div class="card l1"><span style="color:var(--muted);font-size:12.5px">No active seeker in Lane 1</span></div>`;
  else{const c=queueCache.l1[0];l1El.innerHTML=`<div class="card l1"><div class="c-left"><span class="pos">#1</span><span class="r-ico">${c.rIcon}</span><span class="addr">${c.addr} <button class="copy-btn" onclick="copyRaw('${c.full}',event,this)">${COPY_SVG}</button></span><span class="c-meta">PH:$${c.ph.toFixed(0)} • GH:$${c.gh.toFixed(0)}</span></div><div class="amt">$${c.rem.toFixed(2)}</div></div>`}
  const displayList=(searchedL2Cards!==null)?searchedL2Cards:queueCache.l2.slice(0,VISIBLE_L2_CAP),totW=l2TotalWaiting||queueCache.l2.length,effDepth=activeL2CountOnChain||totW;
  const sliceLbl=effDepth<=5?"$10–$50":(effDepth<=20?"$10–$20":"$5–$10");
  $('lane2TitleTxt').innerText=`⚡ Lane 2 Surplus Queue (${sliceLbl} Auto-Slice)`;$('lane2CountTxt').innerText=totW>VISIBLE_L2_CAP?`Top ${VISIBLE_L2_CAP}`:`${totW} Waiting`;
  const l2El=$('lane2Container');
  if(displayList.length===0)l2El.innerHTML=`<div style="text-align:center;color:var(--muted);font-size:12.5px;padding:14px">No nodes waiting in Lane 2</div>`;
  else l2El.innerHTML=displayList.map((c,i)=>`<div class="card l2"><div class="c-left"><span class="pos">#${c.pos||(i+1)}</span><span class="r-ico">${c.rIcon}</span><span class="addr">${c.addr} <button class="copy-btn" onclick="copyRaw('${c.full}',event,this)">${COPY_SVG}</button></span><span class="c-meta">PH:$${c.ph.toFixed(0)} • GH:$${c.gh.toFixed(0)}</span></div><div class="amt">$${c.rem.toFixed(2)}</div></div>`).join("");
}

async function saveTg(){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  let v=$('tgInput').value.trim().toLowerCase();if(!v)return alert("Enter your @username or numeric Chat ID.");
  if(!/^\d+$/.test(v))v='@'+v.replace(/^@+/,'').replace(/[^a-z0-9_]/g,'');
  if(v.length<4)return alert("Enter a valid @username or numeric Chat ID (min 4 chars).");
  const btn=$('saveTgBtn');
  try{
    isTxBusy=true;btn.disabled=true;btn.innerText="Linking...";
    await syncTelegramBotMap();const resolvedCid=extractChatId(v),toStore=(resolvedCid&&!v.includes(':'))?`${v}:${resolvedCid}`:v;
    const tx=await sendContractTx(proto,"setTelegramId",[toStore.slice(0,36)]);await waitTxFast(tx);
    isTxBusy=false;nodeMemCache.clear();myTgId=toStore.slice(0,36);btn.disabled=false;btn.innerText="Save";
    const pingOk=await sendPrivateTg(myTgId,`✅ *GHM21 Telegram Connected!*\nWallet: \`${userAddr}\`\nYou will now receive real-time private alerts for Logins, Provide Help, GH Payouts, Rank Promotions, Competitions, and Tasks!`);
    alert(pingOk?"✅ Telegram ID Locked On-Chain & Test Notification Sent!":`✅ Telegram ID Locked On-Chain! Click '1. Start @${BOT_USERNAME}' and press Start in Telegram to receive private DMs.`);
    refreshAll(true);
  }catch(e){isTxBusy=false;btn.disabled=false;btn.innerText="Save";alertPublicErr(e,"Telegram Notice","This Telegram ID is already locked by another member!")}
}

async function buyGrace(){await payFastPass('1.0',7,$('graceBtn'))}
async function payFastPass(amtStr,pCode,btnEl){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  const origTxt=btnEl?btnEl.innerText:"Fast Pass";
  try{
    isTxBusy=true;if(btnEl)btnEl.disabled=true;
    const liveInfo=await callNodeSafe(userAddr,0);
    if(liveInfo&&!liveInfo.n.isActive){isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=origTxt}return alert("Activate your node with a $20+ Provide Help first before using Fast Pass.")}
    if(pCode===6&&liveInfo&&!liveInfo.n.hasPendingLOH){isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=origTxt}lohPending=false;closeMod('lohModal');refreshAll(true);return alert("✅ Your Letter of Happiness is already unlocked on-chain!")}
    const w=ethers.parseEther(amtStr);if(w>0n)await ensureAllowance(w,btnEl);
    if(btnEl)btnEl.innerText="Confirm in Wallet...";
    const tx=await sendContractTx(proto,"payFastPass",[Number(pCode),w]);
    if(btnEl)btnEl.innerText="Confirming...";
    const receipt=await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();if(btnEl){btnEl.disabled=false;btnEl.innerText=origTxt}
    await notifyRankUpgradesFromLogs(receipt);closeMod('lohModal');closeMod('tasksModal');refreshAll(true);
  }catch(e){isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=origTxt}alertPublicErr(e,"Fast Pass Notice","Fast Pass unavailable right now. Check your balance or active window.")}
}
function paySelectedPillarFastPass(btnEl){
  const sel=$('taskPillarSel'),pNum=Number(sel.value)||1,bit=1<<(pNum-1);
  if((myPillarsMask&bit)!==0||(myWaivedMask&bit)!==0)return alert("This Pillar is already completed or waived in your current 4-cycle rotation! Select an uncompleted Pillar.");
  payFastPass('2.0',pNum,btnEl);
}

async function submitLOH(){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  if(!lohPending)return alert("You do not have a pending LOH right now.");
  const name=$('lohName').value.trim(),f=$('lohFile').files[0],sessionUpKey=`ghm21_loh_up_${C_PREF}_${userAddr.toLowerCase()}_${myLastPayout.toFixed(2)}`,alreadyUploadedInSession=sessionStorage.getItem(sessionUpKey)==='1';
  if(!alreadyUploadedInSession&&(!name||!f))return alert("Enter your name and attach a fresh POP screenshot or short video.");
  if(f&&f.type.startsWith('video/')&&f.size>25*1024*1024)return alert("Please select a short video clip under 25MB so it uploads quickly!");
  let fKey="";const usedList=JSON.parse(localStorage.getItem('ghm21_used_loh_'+C_PREF)||'[]');
  if(f){fKey=await computeFileSha256Hex(f);if(!alreadyUploadedInSession&&usedList.includes(fKey))return alert("⚠️ Duplicate Media Detected: This exact POP screenshot/video has already been submitted before! Please attach a fresh proof.")}
  if(name)localStorage.setItem('ghm21_loh_name',name);
  const cVal=($('lohCountry').value||"").trim(),finalCountry=(cVal&&!cVal.includes('Global'))?cVal:detectedCountry,btn=$('lohSubBtn');
  try{
    isTxBusy=true;btn.disabled=true;
    if(!alreadyUploadedInSession){
      btn.innerText="1/2 Uploading to Channel...";
      await uploadToTelegramFast('auto',LOH_CHANNEL,`📢 *Letter of Happiness*\nFrom: ${name} (${finalCountry})\nAmount: *$${myLastPayout.toFixed(2)} USDT*\nWallet: \`${userAddr}\`\n\n${$('lohText').value}`,f).catch(()=>false);
      sessionStorage.setItem(sessionUpKey,'1');
    }
    btn.innerText="2/2 Confirm in Wallet...";
    const tx=await sendContractTx(proto,"submitLOH",[]);
    btn.innerText="Confirming...";await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();sessionStorage.removeItem(sessionUpKey);
    if(fKey){usedList.push(fKey);localStorage.setItem('ghm21_used_loh_'+C_PREF,JSON.stringify(usedList.slice(-30)))}
    $('lohFile').value="";btn.disabled=false;btn.innerText="Submit LOH";closeMod('lohModal');refreshAll(true);
  }catch(e){isTxBusy=false;btn.disabled=false;btn.innerText=sessionStorage.getItem(sessionUpKey)==='1'?"Retry 2/2 Wallet Unlock":"Submit LOH";if(!isUserCancelErr(e))alert("LOH Wallet Confirmation Interrupted: Please tap the button again to confirm in your wallet.")}
}

async function submitTaskProof(){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  if(!myTgId||myTgId.length<4){alert("⚠️ Please save your Telegram @username or Chat ID in your Dashboard first before submitting a task!");closeMod('tasksModal');openMod('dashModal');return}
  const sel=$('taskPillarSel'),pillarNum=Number(sel.value)||1,pBit=1<<(pillarNum-1);
  if((myPendingPillarsMask&pBit)!==0)return alert(`⏳ Pillar ${pillarNum} already has a pending submission awaiting review in the Community Feed! Select one of the other Pillars.`);
  if((myPillarsMask&pBit)!==0)return alert(`✅ Pillar ${pillarNum} is already verified in your current 4-Pillar rotation! Select one of the remaining Pillars.`);
  const title=PILLAR_TITLES[pillarNum]||"Pillar 1: Social Share",cleanLink=normalizeProofUrl($('taskUrlIn').value.trim()),f=$('taskFileIn').files[0];
  if(!cleanLink.startsWith('https://')||cleanLink.length<16||!cleanLink.split('://')[1]?.includes('/')||!f)return alert("Enter a specific public post/video URL (not a generic homepage) and attach your proof screenshot or video.");
  if(f.type.startsWith('video/')&&f.size>25*1024*1024)return alert("Please select a short video clip under 25MB so it uploads quickly!");
  const mediaHash=await computeFileSha256Hex(f),usedTaskMedia=JSON.parse(localStorage.getItem('ghm21_used_task_media_'+C_PREF)||'[]');
  if(usedTaskMedia.includes(mediaHash))return alert("⚠️ Duplicate Screenshot/Video: This exact image or video file has already been used in a previous task! Please attach a fresh proof.");
  const btn=$('taskSubBtn');
  try{
    isTxBusy=true;btn.disabled=true;btn.innerText="Checking Proof On-Chain...";
    const rp=await getRProv(),rProto=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,rp),liveInfo=await callNodeSafe(userAddr,0);
    if(liveInfo&&!liveInfo.n.isActive){isTxBusy=false;btn.disabled=false;btn.innerText="Submit Proof";return alert("⚠️ Please activate your node with a $20+ Provide Help first before submitting tasks!")}
    try{await rProto.submitTask.staticCall(pillarNum,cleanLink,mediaHash,{from:userAddr})}
    catch(scErr){if(!isCoalesceOrRpcErr(scErr)){isTxBusy=false;btn.disabled=false;btn.innerText="Submit Proof";return alert("❌ Duplicate Proof Rejected On-Chain: Either this exact post URL or this exact screenshot/video file was already used in a previous task!")}}
    const taskUpKey=`ghm21_task_up_${C_PREF}_${cleanLink}_${mediaHash.slice(0,10)}`;
    if(sessionStorage.getItem(taskUpKey)!=='1'){
      btn.innerText="1/2 Uploading Media...";
      await uploadToTelegramFast('auto',AUDITOR_CHANNEL,`🚀 *Task Proof Submitted*\n${title}\nPerformer: \`${userAddr}\` (${getDisplayTg(myTgId)})\nLink: ${cleanLink}`,f).catch(()=>false);
      sessionStorage.setItem(taskUpKey,'1');
    }
    btn.innerText="2/2 Confirm in Wallet...";
    const tx=await sendContractTx(proto,"submitTask",[pillarNum,cleanLink,mediaHash]);
    btn.innerText="Confirming...";await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();sessionStorage.removeItem(taskUpKey);
    usedTaskMedia.push(mediaHash);localStorage.setItem('ghm21_used_task_media_'+C_PREF,JSON.stringify(usedTaskMedia.slice(-60)));
    sendPrivateTg(myTgId,`🚀 *Task Submitted to Community Feed!*\nTask: *${title}*\nLink: ${cleanLink}\nStatus: *Waiting for Verifier Approval*`);
    $('taskUrlIn').value="";$('taskFileIn').value="";btn.disabled=false;btn.innerText="Submit Proof";closeMod('tasksModal');refreshAll(true);
  }catch(e){isTxBusy=false;btn.disabled=false;btn.innerText="Submit Proof";alertPublicErr(e,"Task Notice","Ensure your proof link and media are unique and your node is active.")}
}

async function loadFeed(silent,btnEl){
  const box=$('feedList'),fBtn=btnEl||$('feedRefreshBtn');
  if(!silent&&fBtn){fBtn.disabled=true;fBtn.innerText="..."}
  if(!silent&&!box.innerHTML.trim())box.innerHTML="Loading feed...";
  try{
    const stInfo=await callNodeSafe(userAddr||OPS_WALLET,0),cnt=stInfo?Number(BigInt(stInfo.t[3]||0n)>>128n):totalTaskCount;
    if(cnt===0){box.innerHTML="No active tasks in the last 24h.";if(!silent&&fBtn){fBtn.disabled=false;fBtn.innerText="↻"}return}
    const uLow=(userAddr||"").toLowerCase(),isMainAdm=[activeAuditorWallet.toLowerCase(),OPS_WALLET.toLowerCase()].includes(uLow);
    const isAuth=Boolean(userAddr)&&(isMainAdm||userIsVerifier),now=Math.floor(Date.now()/1000),indices=[];
    for(let i=cnt-1;i>=Math.max(0,cnt-25);i--)indices.push(i);
    const items=(await Promise.all(indices.map(async(i,idx)=>{const s=await callTaskSubSafe(i,idx);return s?{id:i,s}:null}))).filter(Boolean);
    let html="";
    for(const {id,s} of items){
      if(s.isRejected||s.verifiedAt===1)continue;
      if(s.isVerified&&Number(s.verifiedAt)>1&&(now-Number(s.verifiedAt))>86400)continue;
      const tTitle=PILLAR_TITLES[Number(s.pillar)]||"Pillar 1: Social Share";
      const subAgo=s.submittedAt>0?`${fmtDur(Math.max(0,now-s.submittedAt))} ago`:"Live";
      const canRev=isAuth&&!s.isVerified&&(s.performer.toLowerCase()!==uLow||uLow===OPS_WALLET.toLowerCase());
      const canCloseEarly=isMainAdm&&s.isVerified&&s.verifiedAt>1;
      html+=`<div class="m-card" id="taskCard_${id}"><div class="m-row"><b>${s.isVerified?'✅ ':''}${tTitle} <small style="color:var(--muted);font-weight:400">(${subAgo})</small></b><span class="addr" style="font-size:12px;color:var(--muted)">${s.performer.slice(0,6)}...${s.performer.slice(-4)} <button class="copy-btn" onclick="copyRaw('${s.performer}',event,this)">${COPY_SVG}</button></span></div><div class="m-row"><a href="${s.proofLink}" target="_blank" rel="noopener" style="color:var(--cyan);font-size:12.5px">View Proof ↗</a><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="btn-sm cyan" onclick="tipTask(${id},'${s.performer}','${tTitle}',this)">$1 Tip (${s.tipCount})</button>${canRev?`<button class="btn-sm" onclick="revTask(${id},true,'${s.performer}','${tTitle}',this)">✓ Approve</button><button class="btn-sm red" onclick="revTask(${id},false,'${s.performer}','${tTitle}',this)">✕ Reject</button>`:''}${canCloseEarly?`<button class="btn-sm red" onclick="closeFeedTaskEarly(${id},this)" title="Hide from 24h Feed">✕ Close</button>`:''}</div></div></div>`;
    }
    box.innerHTML=html||"No active tasks in the last 24h.";
  }catch(e){if(!silent)box.innerHTML="No active tasks found. Tap ↻ to refresh."}
  if(!silent&&fBtn){fBtn.disabled=false;fBtn.innerText="↻"}
}

async function closeFeedTaskEarly(id,btnEl){
  if(isTxBusy||!confirm("Remove this verified task from the 24h Community Feed early?"))return;
  const orig=btnEl.innerText;
  try{
    isTxBusy=true;btnEl.disabled=true;btnEl.innerText="...";
    const tx=await sendContractTx(proto,"closeFeedTask",[id]);
    taskSubMemCache.delete(id);await waitTxFast(tx);isTxBusy=false;loadFeed(true);
  }catch(e){isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;alertPublicErr(e,"Feed Notice")}
}

async function tipTask(id,perfAddr,title,btnEl){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  const orig=btnEl?btnEl.innerText:"$1 Tip";
  try{
    isTxBusy=true;if(btnEl)btnEl.disabled=true;
    const w=ethers.parseEther("1.0");await ensureAllowance(w,btnEl);
    if(btnEl)btnEl.innerText="Confirm in Wallet...";
    const tx=await sendContractTx(proto,"tipTask",[id,w]);
    taskSubMemCache.delete(id);if(btnEl)btnEl.innerText="Tipping...";await waitTxFast(tx);isTxBusy=false;if(btnEl)btnEl.disabled=false;
    if(perfAddr){const pInfo=await callNodeSafe(perfAddr,0);if(pInfo&&pInfo.tg)sendPrivateTg(pInfo.tg,`👏 *You Received a Task Tip!*\nTask: *${title||'Community Task'}*\nTip: *$1.00 USDT* ($0.70 USDT credited directly to your wallet)!`)}
    loadFeed(true);
  }catch(e){isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=orig}alertPublicErr(e,"Tip Notice","You cannot tip your own task or tip the same task twice.")}
}

async function revTask(id,approve,perfAddr,title,btnEl){
  if(isTxBusy)return;
  let reason="";if(!approve){reason=prompt("Enter rejection reason for performer:","Invalid proof or link")||"Invalid proof";if(!reason)return}
  try{
    isTxBusy=true;if(btnEl){btnEl.disabled=true;btnEl.innerText=approve?"Approving...":"Rejecting..."}
    const tx=await sendContractTx(proto,"reviewTask",[id,approve]);
    taskSubMemCache.delete(id);const receipt=await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    await notifyRankUpgradesFromLogs(receipt);
    const pInfo=await callNodeSafe(perfAddr,0);
    const pTg=pInfo?pInfo.tg:"",newPts=pInfo?Number((BigInt(pInfo.t[0]||0n)>>8n)&65535n):0;
    sendPrivateTg(pTg,approve?`✅ *Your Task Was Approved!*\nTask: *${title}*\nStatus: *Verified On-Chain ✓*\nTotal Task Points: *${newPts} pts ($${newPts}.00 USDT)*${newPts>=10?'\n🎉 You have reached 10+ points and can claim your reward into the queue now!':''}`:`❌ *Your Task Was Rejected*\nTask: *${title}*\nReason: _${reason}_`);
    if(approve&&newPts>=10)tgPost(MAIN_CHANNEL,`🌟 *10+ Task Points Achieved!*\nPerformer \`${perfAddr.slice(0,6)}...${perfAddr.slice(-4)}\` has accumulated *${newPts} Task Points ($${newPts}.00 USDT)* from community tasks and unlocked a withdrawable reward!`);
    loadFeed(true);refreshAll(true);
  }catch(e){isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=approve?"✓ Approve":"✕ Reject"}alertPublicErr(e,"Review Notice")}
}

async function loadCompetitions(btnEl,forceRefresh){
  if(isCompLoading&&!forceRefresh)return;isCompLoading=true;if(forceRefresh)nodeMemCache.clear();
  const cBody=$('compBody'),refBtn=btnEl||$('compRefreshBtn');
  if(btnEl&&refBtn){refBtn.disabled=true;refBtn.innerText="..."}
  if(cBody&&(forceRefresh||!cBody.innerHTML.trim()))cBody.innerHTML=`<tr><td colspan="5" style="text-align:center;color:var(--cyan)">Refreshing live on-chain competition data...</td></tr>`;
  try{
    const rp=await getRProv(Boolean(forceRefresh)),rProto=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,rp);
    const stInfo=await callNodeSafe(userAddr||OPS_WALLET,0);
    if(stInfo){
      const r0Big=BigInt(stInfo.t[0]||0n);
      curCompPreset=Number((r0Big>>37n)&15n)||1;curCompActive=((r0Big>>41n)&1n)===1n;curCompId=Number((r0Big>>42n)&65535n)||1;
      curCompMeta=stInfo.compMeta||curCompMeta;
      if(userAddr){
        myDirects=Number(stInfo.e.directCount||0n);myTeamVol=Number(ethers.formatEther(stInfo.e.directVolume||0n));myVerPillars=Number(stInfo.e.verifiedPillarsCount||0);
        const cUnpacked=unpackCompData(stInfo.t[5]);myCompStatus=cUnpacked.status;mySnapDir=cUnpacked.snapDir;mySnapPil=cUnpacked.snapPil;mySnapVol=cUnpacked.snapVol;myCompPrize=unpackR6Meta(stInfo.t[6]).compPrizeUsd;
      }
    }
    const presetCfg=getActiveCompCfg();
    $('compBannerTitle').innerText=presetCfg.desc;
    const badgeEl=$('compRoundBadge');badgeEl.innerText=`ROUND #${curCompId} • ${curCompPreset===6?'CUSTOM':'PRESET #'+curCompPreset} • ${curCompActive?'ACTIVE 🟢':'ENDED 🔴'}`;badgeEl.style.color=curCompActive?'var(--green)':'var(--red)';
    const nowSec=Math.floor(Date.now()/1000);
    if($('compDatesTxt')){
      if(curCompMeta.startTs>0&&curCompMeta.endTs>0){
        const stD=new Date(curCompMeta.startTs*1000).toLocaleDateString(),enD=new Date(curCompMeta.endTs*1000).toLocaleDateString();
        const remS=curCompMeta.endTs-nowSec;
        $('compDatesTxt').innerText=remS>0&&curCompActive?`⏳ Window: ${stD} – ${enD} (${Math.ceil(remS/86400)}d left)`:`🏁 Window: ${stD} – ${enD} (Concluded)`;
      }else $('compDatesTxt').innerText=curCompActive?"⏳ Window: Active Round":"🏁 Window: Concluded";
    }
    const reqParts=[];
    const totTargets=(presetCfg.reqDir>0?1:0)+(presetCfg.reqVol>0?1:0)+(presetCfg.reqPil>0?1:0)||1;
    const enterBtn=$('compEnterBtn'),stTxt=$('compMyStateTxt');
    if(!curCompActive){enterBtn.disabled=true;enterBtn.innerText="Comp Ended";stTxt.innerText=`This competition round has concluded. Stay tuned in ${MAIN_CHANNEL} for the next round!`}
    else if(myCompStatus===3){enterBtn.disabled=true;enterBtn.innerText=`🏆 Won $${myCompPrize.toFixed(0)} USDT`;stTxt.innerText=`🏆 Prize Paid On-Chain! You received $${myCompPrize.toFixed(2)} USDT in Round #${curCompId}!`}
    else if(myCompStatus>=1){
      const myGainDir=Math.max(0,myDirects-mySnapDir),myGainVol=Math.max(0,Math.floor(myTeamVol)-mySnapVol),myGainPil=Math.max(0,myVerPillars-mySnapPil);
      const isAutoQual=(myGainDir>=presetCfg.reqDir)&&(myGainVol>=presetCfg.reqVol)&&(myGainPil>=presetCfg.reqPil);
      if(presetCfg.reqDir>0)reqParts.push(`+${myGainDir}/${presetCfg.reqDir} Dir`);
      if(presetCfg.reqVol>0)reqParts.push(`+$${myGainVol}/$${presetCfg.reqVol} Vol`);
      if(presetCfg.reqPil>0)reqParts.push(`+${myGainPil}/${presetCfg.reqPil} Tasks`);
      enterBtn.disabled=true;enterBtn.innerText=isAutoQual?"✅ Auto-Qualified!":"⏳ Auto-Tracking";
      stTxt.innerText=isAutoQual?`🎉 All targets met (${reqParts.join(' • ')})! Ready for $${presetCfg.prize} USDT payout!`:`Live Progress: ${reqParts.join(' • ')}`;
    }else{enterBtn.disabled=false;enterBtn.innerText="🎯 Enter Comp";stTxt.innerText="Submit your wallet below—only new referrals, team volume, and verified tasks submitted AFTER entering count!"}

    const uLow=(userAddr||"").toLowerCase(),isMainAdmin=[activeAuditorWallet.toLowerCase(),OPS_WALLET.toLowerCase()].includes(uLow);
    $('compAdminPanel').style.display=isMainAdmin?'flex':'none';
    const slice=await rProto.getAddressSlice(2,0,100).catch(()=>({total:0n,list:[]})),totEntrants=Number(slice.total||0n),list=slice.list||[];
    $('compEntrantCountTxt').innerText=`${totEntrants} Entrant${totEntrants===1?'':'s'}`;
    if(list.length===0){cBody.innerHTML=`<tr><td colspan="5" style="text-align:center;color:var(--muted)">No entrants yet for Round #${curCompId}. Be the first to click "🎯 Enter Comp"!</td></tr>`;if(refBtn){refBtn.disabled=false;refBtn.innerText="↻"}isCompLoading=false;return}
    const rows=[];
    for(let i=0;i<list.length;i+=8){
      const chunk=await Promise.all(list.slice(i,i+8).map(async(addr,bIdx)=>{
        const res=await callNodeSafe(addr,i+bIdx);if(!res)return "";
        const {e,t}=res,cUnp=unpackCompData(t[5]),stCode=cUnp.status,curDir=Number(e.directCount||0n),curVol=Math.floor(Number(ethers.formatEther(e.directVolume||0n))),curPil=Number(e.verifiedPillarsCount||0);
        const gainDir=Math.max(0,curDir-cUnp.snapDir),gainVol=Math.max(0,curVol-cUnp.snapVol),gainPil=Math.max(0,curPil-cUnp.snapPil);
        const passDir=gainDir>=presetCfg.reqDir,passVol=gainVol>=presetCfg.reqVol,passPil=gainPil>=presetCfg.reqPil;
        const passedCnt=(presetCfg.reqDir>0?(passDir?1:0):0)+(presetCfg.reqVol>0?(passVol?1:0):0)+(presetCfg.reqPil>0?(passPil?1:0):0);
        const isQualified=passDir&&passVol&&passPil;
        const prizeWon=unpackR6Meta(t[6]).compPrizeUsd,rIcon=RANK_ICONS[Number(e.rank||0)]||"👤";
        let statusCell=stCode===3?`<span class="t-tick">🏆 WON $${prizeWon.toFixed(2)} USDT (Paid ✓)</span>`:(isQualified?`<span style="color:var(--green);font-weight:800">✅ QUALIFIED (${passedCnt}/${totTargets})</span>${isMainAdmin?` <button class="btn-sm cyan" style="padding:2px 7px;margin-left:4px" onclick="payCompWinner('${addr}',${presetCfg.prize},this)">💸 Pay $${presetCfg.prize}</button>`:''}`:`<span style="color:var(--muted)">⏳ Tracking (${passedCnt}/${totTargets})</span>${isMainAdmin?` <button class="btn-sm" style="padding:2px 6px;margin-left:4px;opacity:0.75" onclick="payCompWinner('${addr}',${presetCfg.prize},this)">💸 Pay</button>`:''}`);
        const dCell=presetCfg.reqDir>0?`<b>+${gainDir}</b>/${presetCfg.reqDir} ${passDir?'✅':'⏳'}`:`+${gainDir} <small style="color:var(--muted)">(—)</small>`;
        const vCell=presetCfg.reqVol>0?`<b>+$${gainVol.toLocaleString()}</b>/$${presetCfg.reqVol.toLocaleString()} ${passVol?'✅':'⏳'}`:`+$${gainVol.toLocaleString()} <small style="color:var(--muted)">(—)</small>`;
        const pCell=presetCfg.reqPil>0?`<b>+${gainPil}</b>/${presetCfg.reqPil} ${passPil?'✅':'⏳'}`:`+${gainPil} <small style="color:var(--muted)">(—)</small>`;
        return `<tr><td><span style="display:inline-flex;align-items:center;gap:4px">${rIcon} ${addr.slice(0,6)}...${addr.slice(-4)} <button class="copy-btn" onclick="copyRaw('${addr}',event,this)">${COPY_SVG}</button></span></td><td style="color:${passDir&&presetCfg.reqDir>0?'var(--green)':'#FFF'}">${dCell}</td><td style="color:${passVol&&presetCfg.reqVol>0?'var(--green)':'var(--cyan)'}">${vCell}</td><td style="color:${passPil&&presetCfg.reqPil>0?'var(--green)':'#FFF'}">${pCell}</td><td>${statusCell}</td></tr>`;
      }));
      rows.push(...chunk.filter(Boolean));
    }
    cBody.innerHTML=rows.join("")||`<tr><td colspan="5" style="text-align:center;color:var(--muted)">No entrants found</td></tr>`;
  }catch(e){}
  if(refBtn){refBtn.disabled=false;refBtn.innerText="↻"}isCompLoading=false;
}

async function enterCompetition(btnEl){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  if((myTotalPH+myTotalGH)<20||myGrantVal>0)return alert("Activate your node with a $20+ Provide Help first before entering competitions!");
  if(lohPending)return alert("Please submit your pending Letter of Happiness first before entering a competition!");
  if(myPendingPillarsMask!==0)return alert("⏳ You have a pending task awaiting review in the Community Feed! Once your pending task is verified (or reviewed), tap Enter Comp so your baseline snapshot is 100% accurate.");
  try{isTxBusy=true;btnEl.disabled=true;btnEl.innerText="Confirm in Wallet...";const tx=await sendContractTx(proto,"enterComp",[]);btnEl.innerText="Registering...";await waitTxFast(tx);isTxBusy=false;loadCompetitions(null,true);refreshAll(true)}
  catch(e){isTxBusy=false;btnEl.disabled=false;btnEl.innerText="🎯 Enter Comp";alertPublicErr(e,"Competition Notice","Ensure your node is active with no pending LOH or unverified task.")}
}

async function startOrEndComp(startNew,btnEl){
  if(!userAddr||isTxBusy)return;
  const orig=btnEl.innerText;
  try{
    if(!startNew){
      if(!confirm("Toggle OFF the current Competition Round on-chain?"))return;
      isTxBusy=true;btnEl.disabled=true;btnEl.innerText="Confirming...";
      const tx=await sendContractTx(proto,"toggleComp",[false]);await waitTxFast(tx);isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;
      tgPost(MAIN_CHANNEL,`🏁 *GHM21 Competition Round #${curCompId} Has Concluded!*\nThank you to all builders and qualifiers!`);
      loadCompetitions(null,true);refreshAll(true);return;
    }
    const presetVal=Number($('compPresetSel').value)||1;
    const durSelVal=$('compDurSel').value,durDays=durSelVal==='custom'?Math.min(90,Math.max(1,Number($('compCustomDaysIn').value)||7)):Number(durSelVal)||7;
    let rD=0,rV=0,rP=0,pZ=25,annDesc="";
    if(presetVal===6){
      rD=Math.max(0,Number($('cCustDir').value)||0);
      rV=Math.max(0,Number($('cCustVol').value)||0);
      rP=Math.max(0,Number($('cCustPil').value)||0);
      pZ=Math.max(5,Number($('cCustPrize').value)||25);
      if(rD===0&&rV===0&&rP===0)return alert("Set at least one requirement greater than 0 (Directs, Volume, or Verified Tasks).");
      const cTitle=($('cCustTitle')?.value||"").trim()||"⚡ Custom Challenge";
      const reqStr=[rD>0?`${rD}+ Directs`:"",rV>0?`$${rV}+ Team Vol`:"",rP>0?`${rP}+ Verified Tasks`:""].filter(Boolean).join(" • ");
      annDesc=`${cTitle}: ${reqStr} → Win $${pZ} USDT! (${durDays} Days)`;
    }else{
      const cfg=COMP_PRESETS[presetVal]||COMP_PRESETS[1];
      rD=cfg.reqDir;rV=cfg.reqVol;rP=cfg.reqPil;pZ=cfg.prize;annDesc=`${cfg.desc} (${durDays} Days)`;
    }
    if(!confirm(`Launch New Competition Round (${durDays} Days)\n${annDesc}?`))return;
    isTxBusy=true;btnEl.disabled=true;btnEl.innerText="Confirming...";
    const tx=await sendContractTx(proto,"launchComp",[presetVal,durDays,rD,rV,rP,pZ]);await waitTxFast(tx);isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;
    tgPost(MAIN_CHANNEL,`🏆 *New GHM21 Auto-Tracked Competition (Round #${curCompId+1}) Launched!*\n\n*${annDesc}*\n\n👉 Open the *🏆 Comp* tab on the GHM21 Marketplace and click *Enter Comp*!`);
    loadCompetitions(null,true);refreshAll(true);
  }catch(e){isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;alertPublicErr(e,"Competition Notice")}
}

async function payCompWinner(winnerAddr,defaultAmt,btnEl){
  if(!userAddr||isTxBusy)return;
  const amt=Number(prompt(`Enter USDT Prize Amount to pay directly from your connected wallet to winner ${winnerAddr.slice(0,6)}...${winnerAddr.slice(-4)}:`,defaultAmt||25));if(!amt||amt<=0)return;
  const orig=btnEl.innerText;
  try{
    isTxBusy=true;btnEl.disabled=true;const w=ethers.parseEther(amt.toString());await ensureAllowance(w,btnEl);
    btnEl.innerText="Confirm in Wallet...";const tx=await sendContractTx(proto,"payCompWinner",[winnerAddr,w]);btnEl.innerText="Paying...";await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    tgPost(MAIN_CHANNEL,`🏆 *Competition Prize Paid On-Chain!*\nWinner: \`${winnerAddr.slice(0,6)}...${winnerAddr.slice(-4)}\`\nPrize Awarded: *$${amt.toFixed(2)} USDT* (Round #${curCompId})!`);
    const wInfo=await callNodeSafe(winnerAddr,0);
    if(wInfo&&wInfo.tg)sendPrivateTg(wInfo.tg,`🏆 *Congratulations! You Won $${amt.toFixed(2)} USDT!*\nYour Competition Round #${curCompId} prize of *$${amt.toFixed(2)} USDT* has been sent directly to your wallet \`${winnerAddr}\`!`);
    loadCompetitions(null,true);refreshAll(true);
  }catch(e){isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;alertPublicErr(e,"Prize Notice")}
}

async function triggerQueueBooster(btnEl){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  if(!myNodeActive)return alert("Activate your node with a $20+ Provide Help first to trigger the Queue Booster.");
  if(lohPending)return alert("Please submit your pending Letter of Happiness first before triggering the Queue Booster.");
  const now=Math.floor(Date.now()/1000),waitSec=Math.max(0,(lastActTime+43200)-now,(lastBoostTimeOnChain+43200)-now);
  if(waitSec>0)return alert(`⏳ 12h Slow-Day Queue Booster unlocks in ${fmtDur(waitSec)}.`);
  if(boosterPoolTotal<=0)return alert("No accumulated leftover reserve available to boost right now.");
  const orig=btnEl?btnEl.innerText:"⚡ Boost Queue";
  try{
    isTxBusy=true;if(btnEl){btnEl.disabled=true;btnEl.innerText="Boosting..."}
    const tx=await sendContractTx(proto,"boostSlowQueue",[]);
    const receipt=await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    const iface=new ethers.Interface(PROTO_ABI);
    let paidCount=0,paidSum=0;
    for(const log of(receipt?.logs||[])){
      try{
        const p=iface.parseLog(log);
        if(p&&p.name==="PayoutDispatched"){
          paidCount++;
          const payAmt=Number(ethers.formatEther(p.args.payoutAmount));
          paidSum+=payAmt;
          const sA=p.args.seeker,remAmt=Number(ethers.formatEther(p.args.remainingBalance)).toFixed(2),ln=Number(p.args.lane);
          const sInfo=await callNodeSafe(sA,0);
          if(sInfo&&sInfo.tg)sendPrivateTg(sInfo.tg,`⚡ *GHM21 Vault Booster Payout (Lane ${ln})!*\nYou received: *$${payAmt.toFixed(2)} USDT*\nRemaining Balance: *$${remAmt} USDT*\n_Submit your Letter of Happiness to continue rotating!_`);
        }
      }catch(_){}
    }
    if(paidSum>0)tgPost(MAIN_CHANNEL,`⚡ *12h Slow-Day Queue Booster Activated!*\nThe Safety Net Vault just dispatched *$${paidSum.toFixed(2)} USDT* in rescue slices across *${paidCount} waiting card(s)*! Check your wallets & post your LOH! 🔥`);
    await refreshAll(true);
    alert(`✅ Slow-Day Queue Booster Dispatched $${paidSum.toFixed(2)} USDT across ${paidCount} waiting member(s)!`);
  }catch(e){
    isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=orig}
    updateVaultBoosterAndReliefUI();
    alertPublicErr(e,"Queue Booster Notice","Ensure the Safety Net Vault is linked in Monitor, 12 quiet hours have passed, and cards are waiting in the queue.");
  }
}

async function claimRelief(btnEl){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  const now=Math.floor(Date.now()/1000),unlockAt=lastActTime+7776000,closeAt=unlockAt+2592000;
  if(lastActTime>0&&now<unlockAt)return alert(`⏳ 90-Day Relief is locked while the protocol is active.\n\nUnlocks only after 90 consecutive days of zero Fresh PH/Recommit activity (${Math.ceil((unlockAt-now)/86400)} days remaining).`);
  if(lastActTime>0&&now>closeAt)return alert("⚠️ The 30-day deficit claim window (Days 90–120) has closed.");
  if(myReliefClaimed)return alert("✅ You have already claimed your 90-Day Relief for this dormancy period ($0.00 remaining).");
  const myProtDef=Math.max(0,(myTotalPH*0.85)-myTotalGH);
  if(myProtDef<=0.0001||myEstReliefUsd<=0)return alert("You do not have an unrecovered net out-of-pocket PH deficit ($0.00 protected deficit — accounting for the 15% instant welcome rebate).");
  const estBefore=myEstReliefUsd,rBtn=btnEl||$('vReliefBtn'),orig=rBtn?rBtn.innerText:"Claim 90-Day Relief";
  try{
    isTxBusy=true;if(rBtn){rBtn.disabled=true;rBtn.innerText="Claiming..."}
    const tx=await sendContractTx(proto,"claimRelief",[]);
    const receipt=await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    let exactPaid=estBefore;
    const tfTopic="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    for(const lg of(receipt?.logs||[])){
      if(lg.topics&&lg.topics[0]===tfTopic&&lg.topics[2]&&lg.topics[2].toLowerCase().endsWith(userAddr.slice(2).toLowerCase())){
        try{exactPaid=Number(ethers.formatEther(BigInt(lg.data)))}catch(_){}
      }
    }
    await refreshAll(true);
    if(myTgId)sendPrivateTg(myTgId,`🛡️ *90-Day Safety Net Relief Paid!*\nAmount Received: *$${exactPaid.toFixed(2)} USDT*\nRemaining Protected Deficit: *$0.00 USDT*`);
    alert(`✅ $${exactPaid.toFixed(2)} USDT 90-Day Relief Paid Directly to Your Wallet!\n\nProtected Deficit Remaining: $0.00 USDT.`);
  }catch(e){
    isTxBusy=false;if(rBtn){rBtn.disabled=false;rBtn.innerText=orig}
    updateVaultBoosterAndReliefUI();
    alertPublicErr(e,"Relief Notice","90-Day Relief is unavailable, Vault is unlinked, or already claimed for this dormancy period.");
  }
}

async function sweepVaultSurplus(){
  if(!userAddr||isTxBusy)return;
  const now=Math.floor(Date.now()/1000),sweepUnlock=lastActTime+10368000;
  if(lastActTime>0&&now<sweepUnlock)return alert(`⏳ Operations Surplus Sweep unlocks after 120 days of inactivity (${Math.ceil((sweepUnlock-now)/86400)} days remaining).`);
  try{isTxBusy=true;const tx=await sendContractTx(proto,"claimRelief",[]);await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();await refreshAll(true);alert("✅ Remaining Vault Surplus Swept to Operations!")}
  catch(e){isTxBusy=false;alertPublicErr(e,"Sweep Notice")}
}

async function setTestDormancy(stage,btnEl){
  if(!userAddr||isTxBusy)return;
  const orig=btnEl.innerText;
  try{
    isTxBusy=true;btnEl.disabled=true;btnEl.innerText="...";
    const tx=await sendContractTx(proto,"setTestnetDormancy",[stage]);await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();btnEl.disabled=false;btnEl.innerText=orig;
    const msgMap={0:"✅ Reset to Live Activity Timestamp!",1:"✅ Simulated 91 Days (90-Day Relief Window Open)!",2:"✅ Simulated 121 Days (120-Day Surplus Sweep Open)!",3:"✅ Simulated 13 Quiet Hours (12h Queue Booster Ready in Vault)!"};
    await refreshAll(true);
    alert(msgMap[stage]||"✅ Simulator Updated!");
  }catch(e){isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;alertPublicErr(e,"Simulator Notice")}
}

async function loadTxHistory(btnEl){
  if(!userAddr)return;if(btnEl){btnEl.disabled=true;btnEl.innerText="..."}
  try{
    const stInfo=await callNodeSafe(userAddr,0),len=stInfo?Number((BigInt(stInfo.t[0]||0n)>>64n)&0xFFFFFFFFn):myTxLen;
    if(len===0){$('txBody').innerHTML=`<tr><td colspan="3" style="text-align:center;color:var(--muted)">No records</td></tr>`;if(btnEl){btnEl.disabled=false;btnEl.innerText="↻"}return}
    const idxs=[];for(let i=len-1;i>=Math.max(0,len-25);i--)idxs.push(i);
    const recs=(await Promise.all(idxs.map((i,idx)=>new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,getRpcAt(idx)).getRecord(userAddr,i,false).catch(()=>null)))).filter(Boolean);
    const LBLS={1:"PH",2:"Recommit 1",3:"GH Payout",4:"LOH",5:"Parked",6:"Resumed",7:"Fast Pass",8:"Matrix Bonus",9:"Task Sub",10:"Task Pts",11:"Task Rej",12:"Tip",13:"Pull L2",14:"Recommit 2",15:"V1 Recovery",16:"Pts Claimed",17:"Comp Prize",18:"Manager Pool",19:"90d Relief",20:"Boost Triggered"};
    $('txBody').innerHTML=recs.map(r=>{
      const packedA=Number(r[0]||0n),tCode=packedA&255,cNum=(packedA>>8)||1,amtNum=Number(ethers.formatEther(r[1]||0n));
      let actLbl=(tCode>=101&&tCode<=109)?`Matrix Bonus-L${tCode-100}`:(LBLS[tCode]||'Action'),amtCol="var(--muted)",amtPre="";
      if((tCode>=101&&tCode<=109)||[3,8,15,16,17,18,19].includes(tCode)){amtCol="var(--green)";amtPre="+"}
      else if(tCode===20){amtCol="var(--gold)";amtPre="⚡ "}
      else if([1,2,7,13,14].includes(tCode)){amtCol="var(--cyan)";amtPre="-"}
      else if(tCode===12){if(Math.abs(amtNum-0.7)<0.05){amtCol="var(--green)";amtPre="+";actLbl="Tip Received"}else{amtCol="var(--cyan)";amtPre="-";actLbl="Tip Sent"}}
      else if(tCode===10){amtCol="var(--green)";amtPre="+"}
      else if(tCode===11)amtCol="var(--red)";
      return `<tr><td><b>C${cNum}:</b> ${actLbl}</td><td style="color:${amtCol};font-weight:700">${amtPre}$${amtNum.toFixed(2)}</td><td>${new Date(Number(r[2]||0n)*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td></tr>`;
    }).join("")||`<tr><td colspan="3">No records</td></tr>`;
  }catch(e){}
  if(btnEl){btnEl.disabled=false;btnEl.innerText="↻"}
}

async function loadL1ToL9(btnEl,forceRefresh){
  if(!userAddr)return;if(!forceRefresh&&Date.now()-lastL1ToL9Time<30000)return;
  if(btnEl){btnEl.disabled=true;btnEl.innerText="..."}
  try{
    const rp=await getRProv(),rProto=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,rp),packedBig=BigInt(await rProto.getDownlineCounts(userAddr).catch(()=>0n));
    for(let l=1;l<=9;l++)$(`l${l}T`).innerText=`${Number((packedBig>>BigInt((l-1)*24))&0xFFFFFFn)}`;
    lastL1ToL9Time=Date.now();
  }catch(e){}
  if(btnEl){btnEl.disabled=false;btnEl.innerText="↻"}
}

async function checkVaultLinkStatus(){
  try{
    const rp=await getRProv(),rVault=new ethers.Contract(SAFETY_VAULT_ADDRESS,VAULT_ABI,rp),linked=await rVault.protocolContract().catch(()=>ethers.ZeroAddress);
    const banner=$('vaultLinkBanner'),txt=$('vaultLinkStatusTxt'),btn=$('linkVaultNowBtn');if(!banner||!txt||!btn)return;
    if(linked&&linked.toLowerCase()===GHM21_PROTOCOL_ADDRESS.toLowerCase()){
      banner.style.borderColor="rgba(0,255,163,0.4)";banner.style.background="rgba(0,255,163,0.05)";txt.style.color="var(--green)";
      txt.innerText=`🟢 Safety Net Vault Linked ✓ (${SAFETY_VAULT_ADDRESS.slice(0,6)}...${SAFETY_VAULT_ADDRESS.slice(-4)} → ${GHM21_PROTOCOL_ADDRESS.slice(0,6)}...${GHM21_PROTOCOL_ADDRESS.slice(-4)})`;btn.style.display="none";
    }else{
      banner.style.borderColor="var(--red)";banner.style.background="rgba(255,51,102,0.09)";txt.style.color="var(--red)";
      txt.innerText=`🔴 Vault Not Linked Yet! Click button to authorize Manager Pool & Vault payouts:`;btn.style.display="inline-block";
    }
  }catch(e){}
}
async function linkVaultFromMonitor(btnEl){
  if(!userAddr)return openMod('walletModal');if(isTxBusy)return;
  const orig=btnEl?btnEl.innerText:"🔗 Link Vault to Protocol";
  try{
    isTxBusy=true;if(btnEl){btnEl.disabled=true;btnEl.innerText="Confirm in Wallet..."}
    const vContract=new ethers.Contract(SAFETY_VAULT_ADDRESS,VAULT_ABI,signer),tx=await withWalletTimeout(vContract.setProtocolContract(GHM21_PROTOCOL_ADDRESS,{gasLimit:150000n}));
    if(btnEl)btnEl.innerText="Linking...";await waitTxFast(tx);
    isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=orig}
    alert("✅ Safety Net Vault successfully linked to GHM21Protocol! Manager Pool claims are now live.");
    await checkVaultLinkStatus();refreshAll(true);
  }catch(e){isTxBusy=false;if(btnEl){btnEl.disabled=false;btnEl.innerText=orig}alertPublicErr(e,"Vault Link Notice","Connect with Operations or Auditor wallet to link the Vault.")}
}

async function saveSocialConfigOnChain(btnEl){
  if(!userAddr||isTxBusy)return;
  const fb=($('socFbIn').value||"").trim().replace(/\|/g,"");
  const mn=($('socMainIn').value||"").trim().replace(/\|/g,"");
  const lh=($('socLohIn').value||"").trim().replace(/\|/g,"");
  const tk=($('socTaskIn').value||"").trim().replace(/\|/g,"");
  const rc=($('socRecIn').value||"").trim().replace(/\|/g,"");
  const bu=($('socBotUserIn').value||"").trim().replace(/^@+/,"").replace(/\|/g,"");
  const btRaw=($('socBotTokIn').value||"").trim().replace(/\|/g,"");
  const prevParts=(customSocialOverrideRaw||"").split("|");
  const btEnc=btRaw?(btRaw.toLowerCase()==='default'?"":xorObfuscateToken(btRaw)):(prevParts[6]||"");
  const packed=[fb,mn,lh,tk,rc,bu,btEnc].join("|");
  if(packed.length>480)return alert("Combined override configuration is too long (max 480 chars).");
  const orig=btnEl.innerText;
  try{
    isTxBusy=true;btnEl.disabled=true;btnEl.innerText="Saving...";
    const tx=await sendContractTx(proto,"updateSocialConfig",[packed==="||||||"?"":packed]);
    await waitTxFast(tx);isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;$('socBotTokIn').value="";
    await syncSocialConfigFromChain(true);
    alert("✅ Emergency Social & Bot Override saved on-chain! All users worldwide are now routed to the updated links.");
  }catch(e){isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;alertPublicErr(e,"Social Config Notice")}
}

function populateSocialAdminFields(){
  const parts=(customSocialOverrideRaw||"").split("|");
  if($('socFbIn')&&document.activeElement!==$('socFbIn'))$('socFbIn').value=parts[0]||"";
  if($('socMainIn')&&document.activeElement!==$('socMainIn'))$('socMainIn').value=parts[1]||"";
  if($('socLohIn')&&document.activeElement!==$('socLohIn'))$('socLohIn').value=parts[2]||"";
  if($('socTaskIn')&&document.activeElement!==$('socTaskIn'))$('socTaskIn').value=parts[3]||"";
  if($('socRecIn')&&document.activeElement!==$('socRecIn'))$('socRecIn').value=parts[4]||"";
  if($('socBotUserIn')&&document.activeElement!==$('socBotUserIn'))$('socBotUserIn').value=parts[5]||"";
}

function setMonFilter(flt){
  monActiveFilter=flt||'all';
  ['all','builders','r0','r1','r2','r3','loh'].forEach(k=>{const el=$('monFlt_'+k);if(el)el.className=(k===monActiveFilter)?'btn-sm cyan':'btn-sm'});
  renderMonitorRows();
}
function updateMonFilterCounts(){
  let cB=0,c0=0,c1=0,c2=0,c3=0,cLoh=0;
  monitorCache.forEach(m=>{if(m.dirCnt>0||m.dirVol>0||m.rank>0)cB++;if(m.rank===0)c0++;else if(m.rank===1)c1++;else if(m.rank===2)c2++;else if(m.rank>=3)c3++;if(m.status==='Pending LOH')cLoh++});
  const setTxt=(id,lbl)=>{const el=$(id);if(el)el.innerText=lbl};
  setTxt('monFlt_all',`All (${monitorCache.length})`);setTxt('monFlt_builders',`🏆 Builders (${cB})`);setTxt('monFlt_r0',`👤 Members (${c0})`);setTxt('monFlt_r1',`🧭 Guiders (${c1})`);setTxt('monFlt_r2',`🏅 Leaders (${c2})`);setTxt('monFlt_r3',`👑 Managers (${c3})`);setTxt('monFlt_loh',`⏳ Pending LOH (${cLoh})`);
}
async function buildMonitorRowObj(a,idx,now){
  const MASK128=(1n<<128n)-1n,res=await callNodeSafe(a,idx);if(!res)return null;
  const {n,e,t,tg}=res,tgDisp=getDisplayTg(tg)||"";
  const r0Big=BigInt(t[0]||0n),pk=Number(r0Big&255n),pendMask=Number((r0Big>>24n)&15n);
  let pendP=0;for(let b=0;b<4;b++)if((pendMask&(1<<b))!==0)pendP++;
  const meta4=unpackR4Meta(t[4]),joinedTs=Number(BigInt(t[3]||0n)&MASK128),gAmt=meta4.grantUsd,cyc=meta4.cycNum||1;
  const totFreshNodePH=Number(ethers.formatEther(n.totalPHProvided||0n)),totGHNode=Number(ethers.formatEther(n.totalGHReceived||0n)),baseTierNum=Number(ethers.formatEther(e.originalBaselineTier||n.currentTier||0n)),isClr=(pk&1)!==0;
  let status="Idle";if(e.isInQueue)status=`Lane ${e.currentLane}`;else if(n.hasPendingLOH)status="Pending LOH";else if(Number(n.cooldownExpiry||0n)>now)status="Cooldown";else if(gAmt>0)status="Grant Ready";else if(totFreshNodePH>0&&!isClr)status="Task Needed";
  return{full:a,short:a.slice(0,6)+"..."+a.slice(-4),tg:tgDisp,rank:Number(e.rank||0),rIcon:RANK_ICONS[Number(e.rank||0)]||"👤",dirCnt:Number(e.directCount||0n),dirVol:Number(ethers.formatEther(e.directVolume||0n)),verPil:Number(e.verifiedPillarsCount||0),pendP,cyc,ph:totFreshNodePH,gh:totGHNode,baseTierNum,joinedTs,gAmt,tier:Number(ethers.formatEther(n.currentTier||0n)).toFixed(0),bal:Number(ethers.formatEther(n.pendingBalance||0n)).toFixed(2),status};
}
async function onMonSearchInput(val){
  renderMonitorRows();const q=(val||"").trim();
  if(ethers.isAddress(q)&&!monitorCache.some(m=>m.full.toLowerCase()===q.toLowerCase())){
    const row=await buildMonitorRowObj(ethers.getAddress(q),0,Math.floor(Date.now()/1000));
    if(row&&(row.ph+row.gh+row.gAmt+Number(row.tier)>0)){monitorCache.unshift(row);updateMonFilterCounts();renderMonitorRows()}
  }
}

async function loadMonitor(btnEl,silent=false){
  if(isMonLoading&&!btnEl)return;isMonLoading=true;const reqId=++monReqSeq;
  if(btnEl){nodeMemCache.clear();taskSubMemCache.clear();await syncSocialConfigFromChain(true)}
  populateSocialAdminFields();
  const mBody=$('monBody'),mBtn=btnEl||$('monRefreshBtn');
  if(mBtn&&!silent){mBtn.disabled=true;mBtn.innerText="↻..."}
  if(mBody&&!silent&&monitorCache.length===0)mBody.innerHTML=`<tr><td colspan="5" style="text-align:center;color:var(--muted)">Loading participants...</td></tr>`;
  try{
    checkVaultLinkStatus();
    const rp=await getRProv(Boolean(btnEl)),rProto=new ethers.Contract(GHM21_PROTOCOL_ADDRESS,PROTO_ABI,rp);
    const [sliceNodes,sliceVerifiers,stInfo]=await Promise.all([
      rProto.getAddressSlice(0,0,150).catch(()=>({total:0n,list:[]})),
      rProto.getAddressSlice(3,0,50).catch(()=>({total:0n,list:[]})),
      callNodeSafe(userAddr||OPS_WALLET,0)
    ]);
    if(reqId!==monReqSeq)return;
    const totNodes=Number(sliceNodes.total||0n),targetList=sliceNodes.list||[];$('monCountTxt').innerText=totNodes;
    const verList=sliceVerifiers.list||[];
    if($('monVerifiersList')){
      $('monVerifiersList').innerHTML=verList.length>0?`Active Verifiers (${verList.length}): `+verList.map(v=>`<span class="t-tick" style="display:inline-flex;align-items:center;gap:4px">${v.slice(0,6)}...${v.slice(-4)} <button class="copy-btn" style="width:16px;height:16px" onclick="copyRaw('${v}',event,this)">${COPY_SVG}</button></span>`).join(" "):"Active Verifiers: None (Auditor & Ops Only)";
    }
    if(lastActTime>0){const ago=Math.max(0,Math.floor(Date.now()/1000)-lastActTime);$('anaLastActTxt').innerText=`Last PH: ${ago<60?'Just now':fmtDur(ago)+' ago'}`}
    const now=Math.floor(Date.now()/1000),tCnt=stInfo?Number(BigInt(stInfo.t[3]||0n)>>128n):totalTaskCount,tIndices=[];
    for(let k=tCnt-1;k>=Math.max(0,tCnt-40);k--)tIndices.push(k);
    const tItems=(await Promise.all(tIndices.map(async(idx,bIdx)=>{const s=await callTaskSubSafe(idx,bIdx);return s?{id:idx,s}:null}))).filter(Boolean);
    let pendCnt=0;
    const tLogHtml=tItems.map(({id,s})=>{
      if(!s.isVerified&&!s.isRejected)pendCnt++;
      const subTimeStr=s.submittedAt>0?new Date(s.submittedAt*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):"";
      const stTxt=s.isVerified?`<span style="color:var(--green)">Approved ✓</span>`:(s.isRejected?`<span style="color:var(--red)">Rejected ✕</span>`:`<span style="color:var(--cyan)">Pending ⏳</span>`);
      const verStr=(s.verifier&&s.verifier!==ethers.ZeroAddress)?`${s.verifier.slice(0,6)}...${s.verifier.slice(-4)} <button class="copy-btn" onclick="copyRaw('${s.verifier}',event,this)">${COPY_SVG}</button>`:"—";
      return `<tr><td><b>#${id+1}</b> P${s.pillar} (${s.performer.slice(0,6)}...${s.performer.slice(-4)}) <button class="copy-btn" onclick="copyRaw('${s.performer}',event,this)">${COPY_SVG}</button></td><td><small style="color:var(--muted)">${subTimeStr}</small> ${stTxt}</td><td>${verStr}</td></tr>`;
    }).slice(0,25).join("");
    $('monPendTasksTxt').innerText=pendCnt;$('monTaskLogBody').innerHTML=tLogHtml||`<tr><td colspan="3" style="text-align:center;color:var(--muted)">No tasks submitted yet</td></tr>`;

    const MASK128=(1n<<128n)-1n,results=[];
    let joined24h=0,joined7d=0,newNodeVolSum=0,newCycleVolSum=0;
    for(let i=0;i<targetList.length;i+=18){const batch=await Promise.all(targetList.slice(i,i+18).map((a,bIdx)=>buildMonitorRowObj(a,i+bIdx,now)));results.push(...batch.filter(Boolean))}
    if(reqId!==monReqSeq)return;
    results.forEach(m=>{
      const isOpsAddr=m.full.toLowerCase()===OPS_WALLET.toLowerCase();
      if(!isOpsAddr&&(m.gAmt===0&&(m.ph>0||m.joinedTs>0))){if(now-m.joinedTs<=86400)joined24h++;if(now-m.joinedTs<=604800)joined7d++}
      if(m.ph>0&&!isOpsAddr){const firstC=Math.min(m.ph,m.baseTierNum>0?m.baseTierNum:m.ph);newNodeVolSum+=firstC;if(m.ph>firstC)newCycleVolSum+=(m.ph-firstC)}
    });
    monitorCache=results;updateMonFilterCounts();
    const recExtra=currentVolNum>newNodeVolSum?Math.max(0,currentVolNum-newNodeVolSum):0,totalC2Plus=results.length===targetList.length?Math.max(newCycleVolSum,recExtra):newCycleVolSum;
    $('anaGrowthVal').innerText=`+${joined24h} / +${joined7d}`;$('anaNewNodeVol').innerText=`$${newNodeVolSum.toLocaleString('en-US',{minimumFractionDigits:2})}`;$('anaNewCycleVol').innerText=`$${totalC2Plus.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    let l1Dem=0,l2Dem=0,actCnt=0,lohCnt=0,tskCnt=0;
    results.forEach(m=>{const bVal=Number(m.bal)||0;if(m.status==='Lane 1'){l1Dem+=bVal;actCnt++}else if(m.status==='Lane 2'){l2Dem+=bVal;actCnt++}else if(m.status==='Pending LOH')lohCnt++;else if(m.status==='Task Needed')tskCnt++;else if(m.status==='Cooldown'||Number(m.tier)>0)actCnt++});
    const vNum=Number(($('vBalTxt')?.innerText||"0").replace(/[^0-9.]/g,''))||0,vRatio=currentVolNum>0?((vNum/currentVolNum)*100).toFixed(1):"0.0";
    $('anaQueueDem').innerText=`$${l1Dem.toFixed(0)} / $${l2Dem.toFixed(0)}`;$('anaNodeHealth').innerText=`${actCnt} / ${lohCnt} / ${tskCnt}`;$('anaVaultRatio').innerText=`$${vNum.toFixed(2)} (${vRatio}%)`;
    renderMonitorRows();

    if(userAddr&&userAddr.toLowerCase()===OPS_WALLET.toLowerCase()){
      const v1List=(await rProto.getAddressSlice(1,0,100).catch(()=>({list:[]}))).list||[],vRows=[];
      for(let j=0;j<v1List.length;j+=12){
        const b=await Promise.all(v1List.slice(j,j+12).map(async(u,bIdx)=>{
          const uInf=await callNodeSafe(u,j+bIdx);if(!uInf)return "";
          const r0U=BigInt(uInf.t[0]||0n),vStat=Number((r0U>>101n)&3n);
          const def=Number(ethers.formatEther(BigInt(uInf.t[5]||0n)&MASK128)),pd=unpackR6Meta(uInf.t[6]).v1PaidUsd,rem=Math.max(0,def-pd);
          let actCell="";
          if(vStat===2)actCell=`<span style="color:var(--red);font-weight:700">Disqualified ✕</span>`;
          else if(vStat===1||rem<=0)actCell=`<span style="color:var(--green);font-weight:700">Settled ✓</span>`;
          else actCell=`<div style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn-sm" style="padding:2px 6px" onclick="payV1Node('${u}',${rem},0,this)">💸 Pay</button><button class="btn-sm cyan" style="padding:2px 6px" onclick="payV1Node('${u}',0,1,this)" title="Mark Settled">✓ Close</button><button class="btn-sm red" style="padding:2px 6px" onclick="payV1Node('${u}',0,2,this)" title="Disqualify False Claim">✕ Disq</button></div>`;
          return `<tr><td>${u.slice(0,6)}...${u.slice(-4)} <button class="copy-btn" onclick="copyRaw('${u}',event,this)">${COPY_SVG}</button></td><td>$${def.toFixed(2)}</td><td style="color:var(--green)">$${pd.toFixed(2)}</td><td>${actCell}</td></tr>`;
        }));
        vRows.push(...b.filter(Boolean));
      }
      $('v1AdminBody').innerHTML=vRows.join("")||`<tr><td colspan="4">No V1 claims</td></tr>`;
    }
  }catch(e){if(mBody&&monitorCache.length===0)mBody.innerHTML=`<tr><td colspan="5">Error loading list. Tap ↻ to retry.</td></tr>`}
  if(mBtn){mBtn.disabled=false;mBtn.innerText="↻"}isMonLoading=false;
}

function renderMonitorRows(){
  const q=($('monSearchIn').value||"").toLowerCase().trim();
  let list=monitorCache.filter(m=>!q||m.full.toLowerCase().includes(q)||(m.tg&&m.tg.toLowerCase().includes(q)));
  if(monActiveFilter==='builders')list=list.filter(m=>m.dirCnt>0||m.dirVol>0||m.rank>0).sort((a,b)=>b.dirVol-a.dirVol||b.dirCnt-a.dirCnt);
  else if(monActiveFilter==='r0')list=list.filter(m=>m.rank===0);
  else if(monActiveFilter==='r1')list=list.filter(m=>m.rank===1).sort((a,b)=>b.dirVol-a.dirVol);
  else if(monActiveFilter==='r2')list=list.filter(m=>m.rank===2).sort((a,b)=>b.dirVol-a.dirVol);
  else if(monActiveFilter==='r3')list=list.filter(m=>m.rank>=3).sort((a,b)=>b.dirVol-a.dirVol);
  else if(monActiveFilter==='loh')list=list.filter(m=>m.status==='Pending LOH');
  $('monBody').innerHTML=list.map(m=>{
    const tgBadge=m.tg?`<div style="color:var(--cyan);font-size:10.5px">${m.tg}</div>`:"",pilTxt=m.pendP>0?`${m.verPil} <span style="color:var(--cyan)">(+${m.pendP}⏳)</span>`:`${m.verPil} Pil`;
    return `<tr><td><span style="display:inline-flex;align-items:center;gap:4px">${m.rIcon} ${m.short} <button class="copy-btn" onclick="copyRaw('${m.full}',event,this)">${COPY_SVG}</button></span>${tgBadge}</td><td><b style="color:var(--cyan)">${m.dirCnt} Dir</b> / <span style="color:var(--green)">$${m.dirVol.toLocaleString('en-US',{maximumFractionDigits:0})}</span></td><td>${pilTxt}</td><td><b>C${m.cyc}</b> • $${m.tier} / <span style="color:var(--green)">$${m.bal}</span><div style="color:var(--muted);font-size:10px">PH:$${m.ph.toFixed(0)} GH:$${m.gh.toFixed(0)}</div></td><td>${m.status}</td></tr>`;
  }).join("")||`<tr><td colspan="5" style="text-align:center;color:var(--muted)">No matching nodes</td></tr>`;
}

async function payV1Node(targetAddr,maxRem,actionCode,btnEl){
  if(isTxBusy)return;
  const orig=btnEl.innerText;
  try{
    let w=0n;
    if(actionCode===2){
      if(!confirm(`Disqualify false V1 claim from ${targetAddr}? This permanently blocks payouts to this claim.`))return;
    }else if(actionCode===1&&maxRem===0){
      if(!confirm(`Mark V1 claim for ${targetAddr.slice(0,6)}... as Settled/Closed without additional payment?`))return;
    }else{
      const amt=Number(prompt(`Enter USDT amount to pay ${targetAddr.slice(0,6)}... (Max $${maxRem.toFixed(2)}):`,maxRem));
      if(!amt||amt<=0||amt>maxRem+0.0001)return;
      w=ethers.parseEther(amt.toString());
    }
    isTxBusy=true;btnEl.disabled=true;
    if(w>0n)await ensureAllowance(w,btnEl);
    btnEl.innerText="Confirm...";
    const tx=await sendContractTx(proto,"manageV1Claim",[targetAddr,w,actionCode]);
    await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();loadMonitor(btnEl,false);
  }catch(e){isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;alertPublicErr(e,"V1 Claim Notice")}
}

async function toggleV1WindowOnChain(btnEl){
  if(isTxBusy)return;
  const nextOpen=!v1WindowOpen;
  if(!confirm(`${nextOpen?'Re-Open':'Close'} the public V1 Recovery submission window on-chain?`))return;
  const orig=btnEl.innerText;
  try{
    isTxBusy=true;btnEl.disabled=true;btnEl.innerText="...";
    const tx=await sendContractTx(proto,"toggleV1Recovery",[nextOpen]);await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    v1WindowOpen=nextOpen;syncV1Visibility();btnEl.disabled=false;refreshAll(true);
  }catch(e){isTxBusy=false;btnEl.disabled=false;btnEl.innerText=orig;alertPublicErr(e,"V1 Window Notice")}
}

async function rotateAuditor(){
  if(isTxBusy)return;const a=$('rotAudIn').value.trim();if(!ethers.isAddress(a))return alert("Enter valid new Auditor 0x address");
  try{isTxBusy=true;const tx=await sendContractTx(proto,"rotateAuditor",[a]);await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();activeAuditorWallet=ethers.getAddress(a);alert(`✅ Auditor Rotated On-Chain to ${activeAuditorWallet.slice(0,6)}...${activeAuditorWallet.slice(-4)}!`);refreshAll(true)}
  catch(e){isTxBusy=false;alertPublicErr(e,"Auditor Notice")}
}

async function manageVerifierRole(st){
  if(isTxBusy)return;const a=$('verAddrIn').value.trim();if(!ethers.isAddress(a))return alert("Enter a valid 0x wallet address");
  try{
    isTxBusy=true;const tx=await sendContractTx(proto,"manageTaskVerifier",[a,Boolean(st)]);await waitTxFast(tx);isTxBusy=false;nodeMemCache.clear();
    $('verAddrIn').value="";alert(st?"✅ Task Verifier Assigned!":"✅ Task Verifier Revoked!");loadMonitor(true,false);
  }catch(e){isTxBusy=false;alertPublicErr(e,"Verifier Notice","Target wallet must be an active registered GHM21 node (and not Operations Wallet).")}
}

function fmtDur(s){if(s<=0)return"0m 00s";const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h>0?`${h}h ${m}m ${sec}s`:`${m}m ${sec<10?'0':''}${sec}s`}

setInterval(()=>{
  if($('vaultModal')?.style.display==='flex')updateVaultBoosterAndReliefUI();
  const now=Math.floor(Date.now()/1000),el=$('dTimerVal');if(!el||!userAddr)return;
  if(pullCdExp>0){const remPull=pullCdExp-now;if(remPull>0&&!eligPullL1&&!eligRecommit){$('myRecTxt').innerText=`Pull CD: ${fmtDur(remPull)}`;syncDockUI()}else if(remPull<=0){pullCdExp=0;refreshAll(true)}}
  if(lohPending){const r=actWinExp>now?fmtDur(actWinExp-now):"EXPIRED";el.innerText=`SUBMIT LOH (${r})`;el.style.color=actWinExp>now?"var(--green)":"var(--red)"}
  else if(cooldownExp>0){
    if(now<=cooldownExp){el.innerText=`30M COOLDOWN (${fmtDur(cooldownExp-now)})`;el.style.color="var(--cyan)"}
    else if(now<=cooldownExp+86400){el.innerText=`24H ACTIVE WINDOW (${fmtDur((cooldownExp+86400)-now)})`;el.style.color="var(--green)"}
    else{el.innerText="INACTIVE";el.style.color="var(--red)"}
  }else if(actWinExp>0){
    if(now<=actWinExp){el.innerText=`24H ACTIVE WINDOW (${fmtDur(actWinExp-now)})`;el.style.color="var(--green)"}
    else{el.innerText="INACTIVE";el.style.color="var(--red)"}
  }else{
    const isOpsNode=userAddr.toLowerCase()===OPS_WALLET.toLowerCase(),actOk=isOpsNode||(myTotalPH+myTotalGH)>0;
    el.innerText=isOpsNode?"PERMANENT ACTIVE ✓":(actOk?"ACTIVE ✓":"INACTIVE");el.style.color=actOk?"var(--green)":"var(--red)";
  }
},1000);

window.addEventListener('focus',()=>{if(!isTxBusy)refreshAll()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!isTxBusy)refreshAll()});

window.onload=async()=>{
  const pExp=$('protoExplorerLink');
  if(pExp){pExp.href=`https://bscscan.com/address/${GHM21_PROTOCOL_ADDRESS}`;pExp.innerText=`${GHM21_PROTOCOL_ADDRESS.slice(0,6)}...${GHM21_PROTOCOL_ADDRESS.slice(-4)} ↗`}
  applyNetworkAndSocialLinks(false,ACTIVE_USDT_ADDRESS);
  hydrateFromCache();updatePillarGuide();
  const savedAmt=Number(localStorage.getItem('ghm21_ph_'+C_PREF)||0);
  if(savedAmt>=20&&savedAmt%10===0){$('phInput').value=savedAmt;highlightMatchingChip(savedAmt)}
  syncV1Visibility();refreshAll(true);
  if(localStorage.getItem('ghm21_connected_wallet')==='1'){
    const st=localStorage.getItem('ghm21_wallet_type')||'safepal';
    (async()=>{for(let i=0;i<8;i++){for(const raw of getCandidateProviders(st)){if((await setupSigner(raw,false,st))&&userAddr)return}await new Promise(r=>setTimeout(r,250))}})();
  }
  setTimeout(()=>{
    detectUserCountry();syncTelegramBotMap();
    const urlParams=new URLSearchParams(window.location.search),qRef=urlParams.get('ref'),path=window.location.pathname.split('/'),rIdx=path.indexOf('ref'),hRef=window.location.hash.includes('0x')?window.location.hash.match(/0x[a-fA-F0-9]{40}/)?.[0]:null;
    const candidateRef=qRef||(rIdx!==-1?path[rIdx+1]:null)||hRef;
    if(candidateRef&&ethers.isAddress(candidateRef))validateReferralLinkOnChain(candidateRef);
  },900);
  setInterval(()=>refreshAll(false),4000);
  setInterval(()=>autoRefreshOpenModals(),30000);
};
