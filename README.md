# 월별 점심 메뉴 달력

팀원과 함께 쓰는 월별 점심 메뉴 달력 웹앱입니다.

## 기능

- **월별 달력**: 이전/다음 달로 이동 가능
- **자동 메뉴 배정**: 평일 기준 주당 배달 3~4회, 나가서 먹기 1~2회
- **주간 중복 없음**: 같은 메뉴는 일주일에 1번만 등장
- **메뉴 변경**: 날짜 클릭 → 원하는 메뉴 선택 (팀 공유 시 변경 내용이 팀원에게도 반영됨)
- **메뉴 후보 추가**: 배달/나가서 먹기 목록에 메뉴 추가 (추가한 메뉴만 삭제 가능, 팀 공유 시 목록도 공유)
- **오늘 날짜 표시**: 오늘 날짜 강조 및 상단에 "오늘: YYYY년 M월 D일 요일" 표시
- **팀 공유**: Supabase 설정 시 메뉴·후보 목록이 팀원과 동일하게 저장·동기화됨

## 실행 방법

`index.html`을 브라우저에서 열거나, 로컬 서버로 실행하세요.

```bash
# 예: Python
python -m http.server 8080
# 브라우저에서 http://localhost:8080/lunch-calendar/ 접속

# 또는 Node (npx)
npx serve .
```

- **Supabase를 설정하지 않으면**: 메뉴·목록은 이 기기의 **localStorage**에만 저장됩니다.
- **Supabase를 설정하면**: 같은 사이트를 쓰는 팀원 모두 **같은 메뉴·목록**을 보고, 누가 바꿔도 모두에게 반영됩니다.

---

## 팀 공유 설정

팀원과 같은 달력·같은 메뉴를 쓰려면 **Supabase**(무료)를 한 번만 설정하면 됩니다.

### 1. Supabase 프로젝트 만들기

1. [Supabase](https://supabase.com)에 가입 후 **New project**로 프로젝트를 만듭니다.
2. 프로젝트가 준비되면 **Settings** → **API**에서 다음을 확인합니다.
   - **Project URL** (예: `https://xxxx.supabase.co`)
   - **anon public** 키 (긴 JWT 문자열)

### 2. 테이블 만들기

Supabase 대시보드에서 **SQL Editor**를 연 뒤, 이 저장소의 **`supabase-setup.sql`** 내용을 붙여 넣고 **Run**을 실행합니다.  
(한 번만 하면 됩니다.)

### 3. config.js 설정

1. **`config.js`** 파일을 엽니다.
2. `url`과 `anonKey`에 위에서 확인한 **Project URL**과 **anon public** 키를 넣습니다.

```javascript
window.__SUPABASE__ = {
  url: 'https://여기프로젝트ID.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

3. 이 프로젝트를 **GitHub Pages**나 다른 곳에 배포한 뒤, 팀원에게 **같은 배포 URL**을 공유합니다.  
   모두 같은 `config.js`가 적용된 사이트를 쓰면, 메뉴·후보 목록이 팀 전체에 공유됩니다.

**주의**: `config.js`에 넣는 anon 키는 브라우저에 노출되는 공개용 키입니다. Supabase 대시보드 비밀번호나 서비스 키는 넣지 마세요.  
팀 전용으로만 쓰는 경우 위 설정으로 충분합니다. 더 보안이 필요하면 Supabase RLS 정책을 조정하면 됩니다.
