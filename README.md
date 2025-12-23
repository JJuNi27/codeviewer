# Code Visualizer (Python)

> **VS Code 확장 프로그램**  
> 파이썬 코드를 *글 설명이 아니라 구조 시각화로 이해*하게 만드는 학습 도구

---

## 📌 프로젝트 개요

**Code Visualizer**는 파이썬 코드를  
“실행 결과”가 아니라 **구조와 흐름** 중심으로 시각화하는  
VS Code Extension입니다.

특히 코딩 초보자가 어려워하는

- for / 중첩 for
- 2차원 배열
- 인덱스 접근 (A[i][j])
- 반복 구조의 흐름

같은 개념을  
**표, 격자, 도형, 하이라이트**로 바로 볼 수 있도록 돕는 것이 목적입니다.

> ❌ 글로 상상  
> ⭕ 눈으로 즉시 이해

---

## 🎯 개발 목적

- 파이썬 문법을 **머릿속 시뮬레이션 없이** 이해할 수 있도록 지원
- “이 코드가 왜 이렇게 동작하는지”를  
  **구조 자체로 설명**
- 실시간 타이핑 → 즉시 시각화되는  
  **사고 보조용 학습 도구** 제작

---

# Code Visualizer – 폴더 구조 & 역할 정리

## 📁 프로젝트 루트

# Code Visualizer – 폴더 구조 & 역할 정리

## 📁 프로젝트 루트

code-visualizer/
├─ package.json
│  └─ VS Code 확장 설정
│     - 명령어 등록 (code-visualizer.open)
│     - activationEvents
│     - build / compile 스크립트
│
├─ tsconfig.json
│  └─ TypeScript 컴파일 설정
│
├─ README.md
│  └─ 프로젝트 설명 / 개발 기록 / 로드맵
│
├─ out/
│  └─ TypeScript 컴파일 결과(js)
│     ※ 자동 생성 폴더 (직접 수정 ❌)
│
└─ src/
   └─ 실제 개발 소스 코드

src/
├─ extension.ts
│  └─ 확장 프로그램 진입점(entry point)
│     - 명령어 등록
│     - PanelController 생성
│     - DocumentWatcher 연결
│     - 전체 흐름을 묶는 허브 역할
│
├─ controllers/
│  ├─ panelController.ts
│  │  └─ WebView 패널 전체 관리
│  │     - 패널 생성 / 닫힘 관리
│  │     - analyzeLite 결과를 HTML로 변환
│  │     - for 루프 표 렌더링
│  │     - 반복 흐름도 렌더링
│  │     - 2차원 배열 Grid 시각화
│  │     - 커서 기반 셀 하이라이트 (.cv-cursor)
│  │     - 자동 순회 애니메이션 (.cv-highlight)
│  │
│  └─ documentWatcher.ts
│     └─ VS Code 에디터 이벤트 감지
│        - 코드 변경 감지
│        - 커서 이동 감지
│        - debounce 처리
│        - PanelController로 코드/커서 전달
│
├─ services/
│  ├─ analyzeLite.ts
│  │  └─ 정규식 기반 라이트 분석기 (MVP 핵심)
│  │     - for / 중첩 for 분석
│  │     - 루프 변수(i, j) 추출
│  │     - range(숫자) 반복 크기 추론
│  │     - 2차원 배열 생성 패턴 감지
│  │     - 배열 접근 A[row][col] + 라인 번호 추적
│  │
│  └─ debounce.ts
│     └─ 입력 이벤트 과도 호출 방지용 유틸
│        (실시간 타이핑 성능 안정화)
│
└─ types/
   └─ (예정)
      - AST 분석 결과 타입 정의용

[ VS Code Editor ]
        │
        ▼
DocumentWatcher
  - 코드 변경
  - 커서 이동
        │
        ▼
PanelController
  - analyzeLite(code)
  - 구조 분석 결과 수신
        │
        ▼
WebView 렌더링
  - 루프 표
  - 흐름도
  - 2차원 배열 Grid
  - 커서 하이라이트

---

## 🛠 현재 구현된 기능 (MVP)

📅 **개발 기준일**: 2025-12-23  
📌 **브랜치**: JJUNI

### 1️⃣ VS Code Extension 기본 구조
- 확장 실행 (`code-visualizer.open`)
- WebView 패널 생성 및 유지
- 파일 타이핑 시 **실시간 업데이트**

---

### 2️⃣ 반복문 구조 시각화 (라이트 분석)

- for / 중첩 for 자동 감지
- 루프 정보 표(Table)로 표시
  - 반복 단계
  - 변수명 (i, j 등)
  - 범위 (range(n))
  - 역할 추정 (행 / 열)

---

### 3️⃣ 반복 흐름도 (Flowchart)

- 중첩 for 구조를 도형으로 표현
- 반복 → body → 반복 흐름 시각화
- SVG 기반 흐름 다이어그램

---

### 4️⃣ 2차원 배열 감지 & 격자 시각화

- 배열 크기 자동 계산
- Grid(격자) 형태로 시각화
- 미리보기 최대 6×6 제한

---

### 5️⃣ 배열 접근 시 커서 하이라이트 ✅

- `A[i][j]` 형태의 인덱스 접근 감지
- 커서 위치 기준:
  - 현재 접근 중인 셀 → **노란색 테두리**
- 루프 자동 순회 가능 시:
  - 셀을 순차적으로 하이라이트 애니메이션

> 코드 실행 ❌  
> 구조 + 접근 흐름 시각화 ⭕

---

## 🧠 설계 철학

- ❌ 실제 코드 실행
- ❌ 값 계산 중심
- ⭕ 문법 구조 분석
- ⭕ 시각적 사고 보조

> “이 코드가 몇을 출력하냐”보다  
> **“이 코드의 구조가 어떻게 생겼냐”**를 보여준다.

---

## 🧩 현재 분석 방식

- **Lite Analyzer (정규식 기반)**
  - 빠른 반응
  - 실시간 타이핑 대응

- 추후 계획:
  - Python AST 기반 정밀 분석

---

## 🚀 다음 개발 목표

### 단기
- if / else 분기 구조 시각화
  - 다이아몬드 형태 Flowchart
- 현재 실행 흐름 강조 (loop → if → cell)
- 배열 값 변화 시 색상 변화 표현

### 중기
- Python AST 연동
- 실제 실행 순서 기반 시각화
- 단계별 실행(슬라이드/타임라인)

### 장기
- 알고리즘 학습 특화 모드
- 백준 / 코딩테스트 시각화 지원
- 교육용 플러그인 형태로 확장

---

## 📂 브랜치 전략

- main : 안정 버전
- JJUNI : 개인 개발 / 실험 브랜치

---

## ✍️ 개발자

- GitHub: https://github.com/JJuNi27

---

## 📈 현재 진행도

**약 40%**

> 아이디어 검증 + MVP 시각화 핵심 완료  
> 이후 단계는 정교화 & 확장
