# 프로젝트 관리 시스템 질의응답 분석 리포트 (간결 버전)

**작성일**: 2024-11-06  
**분석 기준**: domain.md, relation.md, glossary.txt, schema.prisma  
**작성 방식**: 테이블별 전체 컬럼 조회 + WHERE 필터링 + 비즈니스 로직

---

## ✅ 분석 결과: 8개 질문 모두 답변 가능

| 번호 | 질문 요약 | 답변 가능 | 신뢰도 |
|------|----------|----------|--------|
| 1 | 당월 전망 매출/직접이익 (실 단위) | ✅ | 95% |
| 2 | M+3 월별 매출 전망 (Rolling + 수주가능성) | ✅ | 90% |
| 3 | 최근 2개년 매출실적 PBS 집계 | ✅ | 100% |
| 4 | 영업이익 적자 수주 프로젝트 | ✅ | 100% |
| 5 | 최근 3개월 실매출가동율 | ✅ | 100% |
| 6 | 직접이익율 5% 변동 프로젝트 | ✅ | 100% |
| 7 | 전망 vs 실적 gap 분석 | ✅ | 95% |
| 8 | 최초계약이익율 분석/그래프 | ✅ | 100% |

---

## 질문별 상세 분석

### 질문 1: 당월 전망 매출/직접이익 (실 단위)

**필요 테이블**:
1. `po_plan_mth_mgt` - 수주영업 월별 계획 (전망 데이터)
2. `po_pjt_plan` - 프로젝트 마스터 (프로젝트명, 종료일)
3. `pm_wbs_mst` - WBS 마스터 (dept_cd)
4. `cm_dept` - 부서정보 (실 단위 필터)

**WHERE 조건**:
- po_plan_mth_mgt: `plan_ver` = 최신, `acct_dtt` = 계정구분 (공통코드 PM039)
- pm_wbs_mst: `cost_able_yn = 'Y'`
- cm_dept: `dept_dtt_cd` = 부서구분 (실)

**비즈니스 로직**:
```
월 컬럼 매핑: start_year + offset → m1~m24 중 선택
직접이익 = 매출 - (노무비 + 재료비 + 협력작업비 + 경비)
```

**데이터 연결**: po_plan_mth_mgt → (pjt_cd) → po_pjt_plan → (pjt_cd+wbs_cd) → pm_wbs_mst → (dept_cd) → cm_dept

📌 **참고**: acct_dtt 코드값(PM039)은 별도 API로 제공

---

### 질문 2: M+3 월별 매출 전망 (Rolling + 수주가능성)

**[A] 실행 중 프로젝트 - Rolling Data**

**필요 테이블**:
1. `pm_exe_plan_ver` - 실행계획 버전 (최신 ver 조회)
2. `pm_pjt_exe_profit` - 실행손익종합 (월별 매출)
3. `po_pjt_plan` - 프로젝트정보

**WHERE 조건**:
- pm_exe_plan_ver: `approval_sts_cd` = 승인 (공통코드 CM080), pjt_cd별 MAX(ver)
- pm_pjt_exe_profit: `cst_ele_cd` = 매출, `plan_ym BETWEEN M+1 AND M+3`
- po_pjt_plan: `system_sts_cd` = 실행 (공통코드 PM003)

**[B] 신규 프로젝트 - 수주전망 Data**

**필요 테이블**:
1. `po_plan_mth_mgt` - 수주전망
2. `po_pjt_plan` - 프로젝트정보 (수주가능성)

**WHERE 조건**:
- po_plan_mth_mgt: `acct_dtt` = 매출 (공통코드 PM039), 최신 plan_ver
- po_pjt_plan: `system_sts_cd` = 영업/계약 (공통코드 PM003)

**비즈니스 로직**:
```
수주가능성 분류:
IF biz_chk = 'Y' AND suju_score >= 18 THEN '확실'
ELSE IF biz_chk = 'Y' AND suju_score >= 10 THEN '가능'
ELSE '유동'
```

---

### 질문 3: 최근 2개년 매출실적 PBS 집계

**필요 테이블**:
1. `pm_revenue_cdit_rqst_rsl` - 매출실적
2. `po_pjt_plan` - 프로젝트 마스터 (PBS 코드)
3. `pm_wbs_mst` - WBS (dept_cd)
4. `cm_dept` - 부서정보

**WHERE 조건**:
- pm_revenue_cdit_rqst_rsl: `rsl_ym BETWEEN '202301' AND '202412'`
- cm_dept: `dept_nm = 'IT사업실'` 또는 특정 dept_cd

**비즈니스 로직**:
```
집계 기준: 년도(rsl_ym 앞 4자리) + PBS 대/중/소 (po_pjt_plan)
PBS 체계: pbs_big_type_cd / pbs_middle_type_cd / pbs_small_type_cd
```

---

### 질문 4: 영업이익 적자 수주 프로젝트

**필요 테이블**:
1. `po_cont_est_profit_fst_v` - 최초계약 손익 VIEW
2. `po_pjt_plan` - 프로젝트 마스터

**WHERE 조건**:
- po_cont_est_profit_fst_v: `po_f_biz_prof < 0` (적자)
- po_pjt_plan: `SUBSTRING(order_de, 1, 4) = '2024'` (당해년도)

**비즈니스 로직**:
```
영업이익율 = (po_f_biz_prof / po_f_rev_amt) × 100
```

---

### 질문 5: 최근 3개월 실매출가동율

**필요 테이블**:
1. `pm_timecard` - 타임카드 (투입시간)
2. `po_pjt_plan` - 프로젝트 타입 확인
3. `cm_emp` - 직원정보
4. `cm_dept` - 부서정보 (실 단위)
5. `pm_work_time` - 월별 기준 근무시간

**WHERE 조건**:
- pm_timecard: `timecard_ym >= (최근 3개월 시작월)`
- po_pjt_plan: `pjt_type_id` ≠ 비매출/비가동 (공통코드 PO011 제외)
- cm_dept: `dept_dtt_cd` = 부서구분 (실)
- pm_work_time: `use_yn = 'Y'`

**비즈니스 로직**:
```
투입시간 = work_date_1 + work_date_2 + ... + work_date_31 (pm_timecard)
기준근무시간 = 인원수 × 월별 기준근무시간 (pm_work_time.work_time)
실매출가동율 = (투입시간 / 기준근무시간) × 100
```

---

### 질문 6: 직접이익율 5% 변동 프로젝트

**필요 테이블**:
1. `po_cont_est_profit_fst_v` - 최초계약 손익
2. `pm_pjt_exe_profit_hv` - 최종 실행손익 (Hold 포함 VIEW)
3. `pm_exe_plan_ver` - 최신 ver 확인
4. `po_pjt_plan` - 프로젝트정보
5. `pm_wbs_mst` - WBS
6. `cm_dept` - 부서정보 (실 단위)

**WHERE 조건**:
- po_pjt_plan: `system_sts_cd` = 실행 (공통코드 PM003)
- pm_exe_plan_ver: `approval_sts_cd` = 승인 (공통코드 CM080), MAX(ver)
- cm_dept: `dept_dtt_cd` = 부서구분 (실)
- 직접이익율 차이: `ABS(최종 - 최초) >= 5`

**비즈니스 로직**:
```
최초 직접이익 = po_f_rev_amt - (po_f_lcost_amt + po_f_mcost_amt + po_f_ecost_amt)
최초 직접이익율 = (최초 직접이익 / po_f_rev_amt) × 100

최종 직접이익 = [매출] - [노무비 + 재료비 + 협력작업비 + 경비]
최종 직접이익율 = (최종 직접이익 / 최종매출) × 100

차이 = 최종이익율 - 최초이익율

※ cst_ele_cd 값은 공통코드 조회 필요
```

---

### 질문 7: 전망 vs 실적 gap 분석

**필요 테이블**:
1. `po_plan_mth_mgt` - 전월 작성 전망
2. `pm_revenue_cdit_rqst_rsl` - 당월 실적
3. `po_pjt_plan` - 프로젝트정보
4. `pm_wbs_mst` - WBS

**WHERE 조건**:
- po_plan_mth_mgt: `DATE_TRUNC('month', fst_creat_dt) = 전월`, `acct_dtt` = 매출 (공통코드 PM039), 최신 plan_ver
- pm_revenue_cdit_rqst_rsl: `rsl_ym = 당월`
- Gap: `ABS(실적 - 전망) >= 100000000` (1억원)

**비즈니스 로직**:
```
전월 M+1 전망: po_plan_mth_mgt의 해당 월 컬럼
당월 실적: pm_revenue_cdit_rqst_rsl의 revenue_amt 합계
Gap = 당월실적 - 전월전망
```

---

### 질문 8: 최초계약이익율 분석 (그래프)

**필요 테이블**:
1. `po_cont_est_profit_fst_v` - 최초계약 손익
2. `po_pjt_plan` - 프로젝트정보 (pjt_type_id)
3. `pm_wbs_mst` - WBS (dept_cd)
4. `cm_dept` - 부서정보 (실 단위)

**WHERE 조건**:
- po_pjt_plan: `SUBSTRING(order_de, 1, 4) IN ('2023', '2024')`
- cm_dept: `dept_dtt_cd` = 부서구분 (실)
- po_pjt_plan: `pjt_type_id IS NOT NULL`

**비즈니스 로직**:
```
최초계약 영업이익율 = (po_f_biz_prof / po_f_rev_amt) × 100

집계: 년도 + 사업실 + PJT Type별
- 프로젝트 수
- 평균 이익율
- 최대/최소 이익율
- 이익율 구간별 분포 (20% 이상, 10~20%, 10% 미만, 적자)
```

**그래프 종류**:
1. 라인 차트: 년도별 사업실별 평균 이익율 추이
2. 박스 플롯: PJT Type별 이익율 분포
3. 스택 바 차트: 이익율 구간별 프로젝트 수

---

## 🔑 공통 활용 정보

### 데이터 연결 키 (relation.md 기준)

```
po_pjt_plan (pjt_cd)
  ↓
pm_wbs_mst (pjt_cd + wbs_cd)
  ↓
[계획 데이터] (pjt_cd + wbs_cd + ver)
  - pm_dclz_plan (노무비 계획)
  - pm_mcst_plan (재료비 계획)
  - pm_ecst_plan (경비 계획)
  - pm_revenue_plan (매출 계획)
  - pm_pjt_exe_profit (실행손익)

[실적 데이터] (pjt_cd + wbs_cd + rsl_ym)
  - pm_timecard (타임카드)
  - pm_lcst_prmpc_rsl (노무비 실적)
  - pm_mcst_rsl (재료비 실적)
  - pm_ecst_rsl (경비 실적)
  - pm_revenue_cdit_rqst_rsl (매출 실적)

[참조 데이터]
  - cm_emp (empno) → cm_dept (dept_cd)
  - cm_dept (dept_cd) → pm_wbs_mst (dept_cd)
  - cm_com_cd (ty_cd + com_cd) → 공통코드
  - po_cust_sites (cust_seq) → po_pjt_plan (cust_no)
```

### 주요 공통코드

📌 **모든 코드값은 cm_com_cd 테이블 또는 별도 API를 통해 조회 필요**

| 코드 분류 | ty_cd | 필드명 | 용도 |
|----------|-------|--------|------|
| 프로젝트 상태 | PM003 | system_sts_cd | 01:영업, 02:계약, 03:실행, 04:완료, 05:종료, 06:Drop |
| 영업진행상태 | PO002 | biz_sts_cd | 0~9 (기회포착~삭제) |
| 프로젝트 Type | PO011 | pjt_type_id | 10000:비매출, 10001:비가동, 10003~10008:매출타입 |
| 결재 상태 | CM080 | approval_sts_cd | 01:상신, 05:결재중, 09:확인, 10:승인, 20:취소, 50:반려 |
| 결재 경로 | CM004 | approval_pth | 01:PC, 02:모바일 |
| 계정 구분 | PM039 | acct_dtt | 매출/노무비/재료비/협력작업비/경비/공통비 (별도 API 제공) |
| 부서 구분 | - | dept_dtt_cd | 회사, 본부, 실, 팀, 그룹, 부, 부문 등 |

### PBS 코드 체계

📌 **PBS는 프로젝트의 본질(사업 분류)을 정의하는 코드**

| 필드명 | 설명 |
|--------|------|
| pbs_big_type_cd | PBS 대분류 |
| pbs_middle_type_cd | PBS 중분류 |
| pbs_small_type_cd | PBS 소분류 |

---

## 📊 구현 권장사항

### 1. 데이터 조회 순서

```
1단계: 기준 테이블 조회 (WHERE 조건 포함)
2단계: 연결 키로 관련 테이블 조회
3단계: 애플리케이션 레벨에서 데이터 조인
4단계: 비즈니스 로직 적용 (계산, 집계)
5단계: 결과 반환
```

### 2. 성능 최적화

- 필요한 pjt_cd, wbs_cd만 먼저 필터링
- 대량 조회 시 배치 처리 (IN 절 활용)
- 캐싱 고려: 공통코드, 부서정보, 기준근무시간

### 3. 그래프 라이브러리 (질문 8)

- **Chart.js**: 간단한 차트, 빠른 렌더링
- **Recharts**: React 생태계, 반응형
- **D3.js**: 복잡한 커스텀 시각화

---

**작성**: AI 분석  
**버전**: 2.0 (간결 버전)  
**최종 수정일**: 2024-11-06

