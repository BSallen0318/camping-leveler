"use client";
import React, { useEffect, useRef, useState } from "react";

// 캠핑 감성 색상
const COLOR_BG = "#f5f3e7"; // 샌드 베이지
const COLOR_BUBBLE = "#e0e8d9"; // 연녹색
const COLOR_BUBBLE_ACTIVE = "#3cb371"; // 수평(녹색)
const COLOR_RING = "#444"; // 짙은 회색
const COLOR_TEXT = "#222";
const COLOR_TOOLBAR = "#fffbe6";
const COLOR_MODAL_BG = "rgba(0,0,0,0.5)";
const COLOR_MODAL_CONTENT = "#fff";

// 각도 허용 오차(수평 판정)
const LEVEL_TOLERANCE = 0.5;

// 효과음(짧은 삑)
const beep = () => {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 1800;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
  osc.onended = () => ctx.close();
};

// 플래시라이트 제어 (지원 브라우저 한정)
async function toggleFlash(on: boolean) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  const track = stream.getVideoTracks()[0];
  // torch는 일부 브라우저에서만 지원되므로, 타입 단언 없이 안전하게 체크
  if (typeof track.applyConstraints === "function") {
    // advanced 옵션은 표준이지만, 타입 정의에 없으므로 타입 단언 사용
    await (track.applyConstraints as (c: any) => Promise<void>)({ advanced: [{ torch: on }] });
  }
  return track;
}

// SVG 아이콘
const IconSound = ({ on }: { on: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill={on ? '#3cb371' : '#e0e8d9'}/><path d="M8 18V10h4l4-3v14l-4-3H8z" fill="#444"/><path d="M20 14c0-2-1-4-3-5" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/></svg>
);
const IconCalib = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#e0e8d9"/><circle cx="14" cy="14" r="7" stroke="#444" strokeWidth="2"/><path d="M14 7v3m0 8v3m7-7h-3m-8 0H7" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/></svg>
);
const IconFlash = ({ on }: { on: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill={on ? '#ffd700' : '#e0e8d9'}/><path d="M12 4l-1 8h4l-1 8 6-12h-4l1-4z" fill="#444"/></svg>
);
const IconLock = ({ on }: { on: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill={on ? '#444' : '#e0e8d9'}/><rect x="8" y="13" width="12" height="7" rx="2" fill={on ? '#fffbe6' : '#444'} stroke="#444" strokeWidth="1.5"/><path d="M10 13v-2a4 4 0 1 1 8 0v2" stroke={on ? '#fffbe6' : '#444'} strokeWidth="1.5"/></svg>
);
const IconReset = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#e0e8d9"/><path d="M14 8a6 6 0 1 1-6 6" stroke="#444" strokeWidth="1.5"/><path d="M8 8v6h6" stroke="#444" strokeWidth="1.5"/></svg>
);
const IconFeedback = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="#e0e8d9"/><path d="M8 12h12M8 16h8" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/><circle cx="20" cy="12" r="1.5" fill="#444"/><circle cx="18" cy="16" r="1.5" fill="#444"/></svg>
);

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function Home() {
  // 상태
  const [angle, setAngle] = useState({ x: 0, y: 0 });
  const [calib, setCalib] = useState({ x: 0, y: 0 });
  const [sound, setSound] = useState(true);
  const [flash, setFlash] = useState(false);
  const [locked, setLocked] = useState(false);
  const [portrait, setPortrait] = useState(true);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [sensorGranted, setSensorGranted] = useState<boolean>(typeof window !== 'undefined' && (window as any).DeviceOrientationEvent?.requestPermission ? false : true);
  const beeped = useRef(false);

  // iOS 센서 권한 요청
  const requestSensorPermission = async () => {
    if (typeof window !== 'undefined' && (window as any).DeviceOrientationEvent?.requestPermission) {
      try {
        const res = await (window as any).DeviceOrientationEvent.requestPermission();
        if (res === 'granted') {
          setSensorGranted(true);
        } else {
          alert('센서 권한이 거부되었습니다. 설정에서 허용해 주세요.');
        }
      } catch {
        alert('센서 권한 요청 중 오류가 발생했습니다.');
      }
    }
  };

  // 센서 이벤트
  useEffect(() => {
    function handle(e: DeviceOrientationEvent) {
      // X: pitch, Y: roll (단위: deg)
      let x = e.beta ?? 0; // -180~180
      let y = e.gamma ?? 0; // -90~90
      // 가로/세로 모드 변환
      if (!portrait) [x, y] = [y, x];
      setAngle({ x: x - calib.x, y: y - calib.y });
    }
    window.addEventListener("deviceorientation", handle, true);
    return () => window.removeEventListener("deviceorientation", handle);
  }, [calib, portrait]);

  // 화면 회전 감지
  useEffect(() => {
    function onRotate() {
      setPortrait(window.innerHeight >= window.innerWidth);
    }
    window.addEventListener("resize", onRotate);
    onRotate();
    return () => window.removeEventListener("resize", onRotate);
  }, []);

  // 소리 알림
  useEffect(() => {
    const isLevel = Math.abs(angle.x) < LEVEL_TOLERANCE && Math.abs(angle.y) < LEVEL_TOLERANCE;
    if (sound && isLevel && !beeped.current) {
      beep();
      beeped.current = true;
    } else if (!isLevel) {
      beeped.current = false;
    }
  }, [angle, sound]);

  // 플래시라이트 제어
  useEffect(() => {
    if (flash) {
      toggleFlash(true).then(setTrack).catch(() => setFlash(false));
    } else if (track) {
      track.stop();
      setTrack(null);
    }
    // eslint-disable-next-line
  }, [flash]);

  // 잠금 시 버튼 비활성화
  const disableBtn = locked ? "pointer-events-none opacity-40" : "";

  // 버블 위치 계산 (중앙 기준, 최대 40px 이동)
  const maxOffset = 40;
  const offsetX = clamp(angle.y, -10, 10) * (maxOffset / 10);
  const offsetY = clamp(angle.x, -10, 10) * (maxOffset / 10);
  const isLevel = Math.abs(angle.x) < LEVEL_TOLERANCE && Math.abs(angle.y) < LEVEL_TOLERANCE;

  // 캘리브레이션
  const handleCalib = () => {
    setCalib({ x: angle.x + calib.x, y: angle.y + calib.y });
    setShowReset(true);
  };
  const handleReset = () => {
    setCalib({ x: 0, y: 0 });
    setShowReset(false);
  };

  // 피드백 제출
  const handleFeedbackSubmit = () => {
    if (feedbackText.trim()) {
      // 실제로는 서버로 전송하거나 로컬 스토리지에 저장
      console.log("피드백 제출:", feedbackText);
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackText("");
        setFeedbackSubmitted(false);
      }, 2000);
    }
  };

  // 렌더링
  if (!sensorGranted) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center" style={{ background: COLOR_BG }}>
        <div className="text-xl font-bold mb-6" style={{ color: COLOR_TEXT }}>
          센서 권한이 필요합니다
        </div>
        <div className="mb-8 text-center text-base" style={{ color: COLOR_TEXT }}>
          iOS(아이폰/아이패드)에서는<br />수평계 사용을 위해<br />센서 권한이 필요합니다.<br />
          아래 버튼을 눌러 권한을 허용해 주세요.
        </div>
        <button
          onClick={requestSensorPermission}
          className="px-6 py-3 rounded text-lg font-bold shadow"
          style={{ background: COLOR_BUBBLE_ACTIVE, color: 'white' }}
        >
          센서 권한 요청
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between items-center" style={{ background: COLOR_BG }}>
      {/* 중앙 대형 버블 수평계 */}
      <div className="flex-1 flex flex-col justify-center items-center w-full">
        <div className="relative" style={{ width: 260, height: 260 }}>
          {/* 원형 수평계 */}
          <svg width={260} height={260}>
            <circle cx={130} cy={130} r={120} fill={COLOR_RING} />
            <circle cx={130} cy={130} r={110} fill={COLOR_BG} />
            <circle cx={130} cy={130} r={100} fill={COLOR_RING} />
            <circle cx={130} cy={130} r={90} fill={COLOR_BG} />
          </svg>
          {/* 버블 */}
          <div
            style={{
              position: "absolute",
              left: 130 + offsetX - 36,
              top: 130 + offsetY - 36,
              width: 72,
              height: 72,
              borderRadius: 36,
              background: isLevel ? COLOR_BUBBLE_ACTIVE : COLOR_BUBBLE,
              border: `4px solid ${COLOR_RING}`,
              boxShadow: isLevel ? "0 0 24px #3cb37188" : "0 2px 8px #8884",
              transition: "background 0.2s, box-shadow 0.2s, left 0.1s, top 0.1s"
            }}
          />
        </div>
        {/* 각도 표시 */}
        <div className="mt-8 flex flex-col items-center text-2xl font-bold" style={{ color: COLOR_TEXT }}>
          <span>X: {angle.x.toFixed(1)}°</span>
          <span>Y: {angle.y.toFixed(1)}°</span>
        </div>
      </div>
      {/* 하단 툴바 */}
      <div className="w-full flex justify-center items-center gap-4 py-4" style={{ background: COLOR_TOOLBAR, borderTop: "1.5px solid #e0e8d9" }}>
        <button className={disableBtn} onClick={() => setSound((v) => !v)} aria-label="소리 알림 토글">
          <IconSound on={sound} />
        </button>
        <button className={disableBtn} onClick={handleCalib} aria-label="캘리브레이션">
          <IconCalib />
        </button>
        {showReset && (
          <button className={disableBtn} onClick={handleReset} aria-label="캘리브레이션 리셋">
            <IconReset />
          </button>
        )}
        <button className={disableBtn} onClick={() => setFlash((v) => !v)} aria-label="플래시라이트 토글">
          <IconFlash on={flash} />
        </button>
        <button className={disableBtn} onClick={() => setShowFeedback(true)} aria-label="피드백">
          <IconFeedback />
        </button>
        <button onClick={() => setLocked((v) => !v)} aria-label="화면 잠금">
          <IconLock on={locked} />
        </button>
      </div>

      {/* 피드백 모달 */}
      {showFeedback && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: COLOR_MODAL_BG }}
          onClick={() => setShowFeedback(false)}
        >
          <div 
            className="mx-4 p-6 rounded-lg max-w-sm w-full"
            style={{ background: COLOR_MODAL_CONTENT }}
            onClick={(e) => e.stopPropagation()}
          >
            {!feedbackSubmitted ? (
              <>
                <h3 className="text-lg font-bold mb-4" style={{ color: COLOR_TEXT }}>
                  피드백 보내기
                </h3>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="개선사항이나 버그를 알려주세요..."
                  className="w-full h-24 p-3 border rounded resize-none mb-4"
                  style={{ borderColor: COLOR_RING }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="flex-1 py-2 px-4 rounded"
                    style={{ background: COLOR_BUBBLE, color: COLOR_TEXT }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={!feedbackText.trim()}
                    className="flex-1 py-2 px-4 rounded disabled:opacity-50"
                    style={{ background: COLOR_BUBBLE_ACTIVE, color: "white" }}
                  >
                    제출
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">✅</div>
                <p style={{ color: COLOR_TEXT }}>피드백이 제출되었습니다!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
