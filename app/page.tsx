"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const SLIDE_INTERVAL = 8;

interface Reservoir {
  id: number;
  name: string;
  water_level: number;
  threshold: number;
  comm_status: boolean;
}

interface Panel {
  id: number;
  name: string;
  badge: "OK" | "ERR";
  waterLevel: number;
  threshold: number;
  capacity: number;
}

const getPerPage = () => {
  const w = window.innerWidth;
  if (w <= 640) return 6;
  if (w <= 1024) return 9;
  if (w <= 1440) return 12;
  return 15;
};

const getTheme = (item: Panel) => {
  if (item.badge === "ERR") return "danger";
  if (item.capacity > 120) return "danger";
  if (item.capacity > 100) return "warning";
  return "normal";
};

const waveHeight = (capacity: number) => {
  const clamped = Math.max(0, Math.min(130, capacity));
  return Math.min(Math.round((clamped / 100) * 66.6), 90);
};

export default function Home() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [prevPage, setPrevPage] = useState(-1);
  const [countdown, setCountdown] = useState(SLIDE_INTERVAL);
  const [perPage, setPerPage] = useState(15);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(3);

  const clockTimer = useRef<NodeJS.Timeout | null>(null);
  const dataTimer = useRef<NodeJS.Timeout | null>(null);
  const slideTimer = useRef<NodeJS.Timeout | null>(null);
  const exitTimer = useRef<NodeJS.Timeout | null>(null);

  const okCount = panels.filter((p) => p.badge === "OK").length;
  const errCount = panels.filter((p) => p.badge === "ERR").length;
  const avgCapacity = panels.length
    ? Math.round(panels.reduce((s, p) => s + p.capacity, 0) / panels.length)
    : 0;
  const totalPages = Math.ceil(panels.length / perPage);
  const pagedPanels: Panel[][] = [];
  for (let i = 0; i < panels.length; i += perPage) {
    pagedPanels.push(panels.slice(i, i + perPage));
  }

  const loadDevices = useCallback(async () => {
    const res = await fetch("/api/devices");
    const data: Reservoir[] = await res.json();
    setPanels(
      data
        .map((item) => {
          const waterLevel = Number(item.water_level);
          const threshold = Number(item.threshold);
          const rawCapacity =
            threshold > 0 ? Math.round((waterLevel / threshold) * 100) : 0;
          const capacity = Math.max(0, Math.min(130, rawCapacity));
          return {
            id: item.id,
            name: item.name,
            badge: item.comm_status ? "OK" : "ERR",
            waterLevel,
            threshold,
            capacity,
          } as Panel;
        })
        .sort((a, b) => a.id - b.id),
    );
  }, []);

  const goToPage = useCallback((idx: number) => {
    setCurrentPage((prev) => {
      if (idx === prev) return prev;
      setPrevPage(prev);
      setTimeout(() => setPrevPage(-1), 600);
      return idx;
    });
    setCountdown(SLIDE_INTERVAL);
  }, []);

  const startExitCountdown = useCallback(() => {
    if (exitTimer.current) clearInterval(exitTimer.current);
    setExitCountdown(3);
    setShowExitModal(true);
    exitTimer.current = setInterval(() => {
      setExitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(exitTimer.current!);
          setShowExitModal(false);
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    setPerPage(getPerPage());
    loadDevices();

    const updateTime = () =>
      setCurrentTime(
        new Date().toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    updateTime();
    clockTimer.current = setInterval(updateTime, 1000);
    dataTimer.current = setInterval(loadDevices, 20000);

    slideTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCurrentPage((cp) => {
            const next = (cp + 1) % Math.ceil(panels.length / perPage || 1);
            setPrevPage(cp);
            setTimeout(() => setPrevPage(-1), 600);
            return next;
          });
          return SLIDE_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    const handleResize = () => setPerPage(getPerPage());
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      startExitCountdown();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      if (clockTimer.current) clearInterval(clockTimer.current);
      if (dataTimer.current) clearInterval(dataTimer.current);
      if (slideTimer.current) clearInterval(slideTimer.current);
      if (exitTimer.current) clearInterval(exitTimer.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return (
    <div className="app">
      {/* 헤더 */}
      <div className="header">
        <div className="header-left">
          <div className="logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
          </div>
          <div>
            <h1>저수지 수위 통합 모니터링</h1>
            <p className="header-desc">
              주요 관측소 실시간 수위 · 임계치 · 통신 상태를 확인합니다.
            </p>
          </div>
        </div>
        <div className="header-right">
          <div className="live">
            <span className="live-dot"></span>실시간 데이터 연동 중
          </div>
          <div className="clock" onClick={() => document.exitFullscreen?.()}>
            {currentTime}
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div className="stats">
        <div className="stat">
          <div className="stat-icon cyan">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2c-4.42 0-8 3.58-8 8
  0 5.25 7 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
              />
            </svg>
          </div>
          <div>
            <div className="stat-label">총 관측소</div>
            <div className="stat-value" style={{ color: "var(--cyan)" }}>
              {panels.length}
              <span className="stat-unit">개소</span>
            </div>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M1 9l2 2c4.97-4.97
  13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4 2 2c2.76-2.76 7.24-2.76
  10 0l2-2C15.14 9.14 8.87 9.14 5 13z"
              />
            </svg>
          </div>
          <div>
            <div className="stat-label">통신 정상</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>
              {okCount}
              <span className="stat-unit">개소</span>
            </div>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2
  12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              />
            </svg>
          </div>
          <div>
            <div className="stat-label">통신 오류</div>
            <div className="stat-value" style={{ color: "var(--red)" }}>
              {errCount}
              <span className="stat-unit">개소</span>
            </div>
          </div>
        </div>
        <div className="stat">
          <div className="stat-icon amber">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M17.65 6.35C16.2 4.9
  14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31
  0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
              />
            </svg>
          </div>
          <div>
            <div className="stat-label">평균 저수율</div>
            <div className="stat-value" style={{ color: "var(--amber)" }}>
              {avgCapacity}
              <span className="stat-unit">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 섹션 바 */}
      <div className="section-bar">
        <div className="section-title">관측소 현황</div>
        <div className="section-right">
          <div className="page-dots">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                className={`dot-btn${idx === currentPage ? " active" : ""}`}
                onClick={() => goToPage(idx)}
              />
            ))}
          </div>
          <span className="page-timer">{countdown}s</span>
          <div className="section-badge">20초 간격 갱신</div>
        </div>
      </div>

      {/* 슬라이드 */}
      <div className="slide-area">
        {pagedPanels.map((page, pIdx) => (
          <div
            key={pIdx}
            className={`page${pIdx === currentPage ? " active" : ""}${pIdx === prevPage ? " exit" : ""}`}
          >
            {page.map((item) => {
              const theme = getTheme(item);
              return (
                <div key={item.id} className="card">
                  <div className={`threshold-line ${theme}`}>
                    <span className="threshold-tag">100%</span>
                  </div>
                  <div
                    className={`wave-bg ${theme}`}
                    style={{ height: waveHeight(item.capacity) + "%" }}
                  >
                    <svg
                      className="w1"
                      viewBox="0 0 720 20"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,8 C40,2 80,14 120,8 C160,2 200,14 240,8 C280,2 320,14 360,8 C400,2 440,14 480,8
  C520,2 560,14 600,8 C640,2 680,14 720,8 L720,20 L0,20 Z"
                      />
                    </svg>
                    <svg
                      className="w2"
                      viewBox="0 0 720 20"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,8 C40,2 80,14 120,8 C160,2 200,14 240,8 C280,2 320,14 360,8 C400,2 440,14 480,8
  C520,2 560,14 600,8 C640,2 680,14 720,8 L720,20 L0,20 Z"
                      />
                    </svg>
                    <div className="wave-fill"></div>
                  </div>
                  <div className="card-inner">
                    <div className="card-head">
                      <div className={`card-icon ${theme}`}>
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path
                            d="M12 2c-4.42
  0-8 3.58-8 8 0 5.25 7 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34
  3-3 3z"
                          />
                        </svg>
                      </div>
                      <span className="card-name">{item.name}</span>
                    </div>
                    <div className="card-body">
                      <div className="card-data">
                        <div className="data-row">
                          <span className="data-label">현재수위</span>
                          <span className="data-val">
                            {item.waterLevel.toFixed(2)}
                            <span className="u">m</span>
                          </span>
                        </div>
                        <div className="data-row">
                          <span className="data-label">임계치</span>
                          <span className="data-thresh">
                            {item.threshold.toFixed(2)}
                            <span className="u">m</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="footer-label">저수율</span>
                      <span className={`footer-pct ${theme}`}>
                        {item.capacity}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 종료 모달 */}
      {showExitModal && (
        <div className="exit-modal">
          <div className="exit-modal-box">
            <p>{exitCountdown}초 후에 종료됩니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
