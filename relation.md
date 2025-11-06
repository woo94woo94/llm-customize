# 프로젝트 관리 시스템 테이블 관계도

## 목차
1. [기본 테이블 관계](#1-기본-테이블-관계)
2. [pjt_cd 기반 조인 관계](#2-pjt_cd-기반-조인-관계)
3. [코드 필드 기반 조인 관계](#3-코드-필드-기반-조인-관계)
4. [실무 SQL 예시](#4-실무-sql-예시)

---

## 1. 기본 테이블 관계

### po_pjt_plan + pm_wbs_mst (1:N 관계)

**핵심 구조:**
- `po_pjt_plan`: 프로젝트 마스터 정보 (PK: pjt_cd)
- `pm_wbs_mst`: 프로젝트 실행팀 및 매출액 관리 (PK: pjt_cd + wbs_cd)
- **관계**: 1개 프로젝트 : 여러 WBS (1:N 관계)

**JOIN 쿼리:**
```sql
SELECT *
FROM po_pjt_plan p
INNER JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd
```

**JOIN 결과 주요 필드:**

| 구분 | 필드명 | 타입 | 설명 |
|------|--------|------|------|
| **프로젝트 기본정보 (po_pjt_plan)** ||||
|| `p.pjt_cd` | VARCHAR(15) | 프로젝트 코드 (PK, JOIN KEY) |
|| `p.pjt_nm` | VARCHAR(100) | 프로젝트명 |
|| `p.long_nm` | VARCHAR(500) | 발주처 계약명 |
|| `p.pjt_type_id` | VARCHAR(10) | 프로젝트 Type (공통코드 PO011) |
|| `p.biz_sts_cd` | VARCHAR(10) | 영업진행상태코드 (공통코드 PO002) |
|| `p.system_sts_cd` | VARCHAR(10) | 프로젝트상태코드 (공통코드 PM003) |
|| `p.strategy_biz_cd` | VARCHAR(10) | DX신사업 (공통코드 PO140) |
| **고객 정보** ||||
|| `p.cust_no` | VARCHAR(30) | 고객사번호 |
|| `p.ori_cust_no` | VARCHAR(30) | 원발주처 고객사번호 |
| **영업 담당자** ||||
|| `p.biz_person_id` | VARCHAR(10) | 영업사원번호 |
|| `p.quote_req_person_id` | VARCHAR(10) | 견적산출요청자 사번 |
|| `p.estimate_person_id` | VARCHAR(10) | 견적담당자 사번 |
| **실행 담당자** ||||
|| `p.carrying_out_person_id` | VARCHAR(10) | 실행PM 사번 |
|| `p.carrying_out_team_id` | VARCHAR(30) | 실행팀 C/C |
| **일정 정보** ||||
|| `p.sales_start_de` | VARCHAR(8) | 영업시작일 (YYYYMMDD) |
|| `p.sales_end_de` | VARCHAR(8) | 영업종료일 (YYYYMMDD) |
|| `p.order_de` | VARCHAR(8) | 수주일 (YYYYMMDD) |
|| `p.contract_date` | VARCHAR(8) | 계약일 (YYYYMMDD) |
|| `p.start_de` | VARCHAR(8) | 계약공기시작일 (YYYYMMDD) |
|| `p.end_de` | VARCHAR(8) | 계약공기종료일 (YYYYMMDD) |
|| `p.exe_begin_date` | VARCHAR(8) | 실행공기시작일 (YYYYMMDD) |
|| `p.exe_end_date` | VARCHAR(8) | 실행공기종료일 (YYYYMMDD) |
|| `p.pjt_compt_date` | VARCHAR(8) | 프로젝트완료일 (YYYYMMDD) |
|| `p.pjt_close_date` | VARCHAR(8) | 프로젝트종료일 (YYYYMMDD) |
| **금액 정보** ||||
|| `p.order_amt` | DECIMAL | 수주예상금액 |
|| `p.cont_won_amt` | DECIMAL | 원화 계약금액 |
|| `p.cont_fc_amt` | DECIMAL | 외자 계약금액 |
|| `p.cont_fc_uom` | VARCHAR(10) | 외자 계약단위 |
|| `p.cont_ex_rate` | DECIMAL | 계약 환율 |
| **버전 및 상태** ||||
|| `p.exe_plan_ver` | DECIMAL | 프로젝트 실행 버전 |
|| `p.boq_ver` | VARCHAR(5) | BOQ Version |
|| `p.approval_id` | DECIMAL | 결재요청번호 |
| **특수 사업 구분** ||||
|| `p.nsc_yn` | VARCHAR(1) | NSC 계약여부 |
|| `p.aibd_biz_yn` | VARCHAR(1) | AI/BigData 사업여부 |
|| `p.sla_biz_yn` | VARCHAR(1) | SLA 사업여부 |
|| `p.bs_yn` | VARCHAR(1) | BS과제 여부 |
|| `p.priority_mng_yn` | VARCHAR(1) | 중점관리대상 |
|| `p.self_asgmt_yn` | VARCHAR(1) | 자체과제 |
|| `p.govn_asgmt_yn` | VARCHAR(1) | 국책과제여부 |
| **WBS 정보 (pm_wbs_mst)** ||||
|| `w.pjt_cd` | VARCHAR(15) | 프로젝트 코드 (PK, JOIN KEY) |
|| `w.wbs_cd` | VARCHAR(15) | WBS 코드 (PK) |
|| `w.wbs_desc` | VARCHAR(50) | WBS 내역 |
|| `w.dept_cd` | VARCHAR(20) | 부서 코드 |
|| `w.costct_cd` | VARCHAR(10) | Cost Center 코드 |
|| `w.costct_ty_cd` | VARCHAR(7) | Cost Center 구분 코드 |
|| `w.revenue_amt` | DECIMAL | 매출금액 |
|| `w.sys_cd` | VARCHAR(2) | 시스템 구분 (PO:POM, BP:BPS, PM:PMS) |
|| `w.dtt_ty` | VARCHAR(2) | 구분 (01:견적, 02:계약, 03:실행) |
|| `w.epld_end_yn` | VARCHAR(1) | 조기종료여부 |
|| `w.cost_able_yn` | VARCHAR(1) | WBS 원가처리가능 FLAG |
|| `w.wbs_start_de` | VARCHAR(8) | 수행기간시작일 (YYYYMMDD) |
|| `w.wbs_end_de` | VARCHAR(8) | 수행기간종료일 (YYYYMMDD) |
|| `w.wbs_cust_no` | VARCHAR(30) | WBS별 고객사번호 |
|| `w.wbs_job` | VARCHAR(500) | 수행업무 |
| **Audit 필드** ||||
|| `p.fst_creat_emp_id` | DECIMAL | 프로젝트 최초생성사원 ID |
|| `p.fst_creat_dt` | TIMESTAMP | 프로젝트 최초생성일시 |
|| `p.lst_upt_emp_id` | DECIMAL | 프로젝트 최종수정사원 ID |
|| `p.lst_upt_dt` | TIMESTAMP | 프로젝트 최종수정일시 |
|| `w.fst_creat_emp_id` | DECIMAL | WBS 최초생성사원 ID |
|| `w.fst_creat_dt` | TIMESTAMP | WBS 최초생성일시 |
|| `w.lst_upt_emp_id` | DECIMAL | WBS 최종수정사원 ID |
|| `w.lst_upt_dt` | TIMESTAMP | WBS 최종수정일시 |

**실무 활용 예시:**
```sql
-- 프로젝트 + WBS 기본 정보 조회
SELECT 
    -- 프로젝트 식별자
    p.pjt_cd,
    p.pjt_nm,
    p.long_nm,
    
    -- WBS 정보
    w.wbs_cd,
    w.wbs_desc,
    w.revenue_amt AS wbs_revenue,
    w.dept_cd AS wbs_dept,
    w.costct_cd AS wbs_costcenter,
    
    -- 프로젝트 상태
    p.system_sts_cd,
    p.biz_sts_cd,
    
    -- 일정 정보
    p.exe_begin_date,
    p.exe_end_date,
    w.wbs_start_de,
    w.wbs_end_de,
    
    -- 실행 담당자
    p.carrying_out_person_id AS pm_empno,
    p.carrying_out_team_id AS pm_team,
    
    -- 계약 금액
    p.cont_won_amt AS contract_amount,
    w.revenue_amt AS wbs_revenue_amount,
    
    -- 버전 정보
    p.exe_plan_ver AS current_version,
    p.boq_ver
    
FROM po_pjt_plan p
INNER JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd
WHERE p.system_sts_cd IN ('PM003_진행중') -- 진행중인 프로젝트만
  AND w.cost_able_yn = 'Y' -- 원가처리 가능한 WBS만
ORDER BY p.pjt_cd, w.wbs_cd
```

---

### 프로젝트별 WBS 집계 조회 (1:N 관계 활용)

**1:N 관계 특성:**
- 하나의 프로젝트(`pjt_cd`)가 여러 WBS를 가질 수 있음
- 프로젝트별 통계가 필요한 경우 **GROUP BY** 사용 필수
- WBS별 상세 vs 프로젝트별 집계를 명확히 구분

**프로젝트별 WBS 통계 쿼리:**
```sql
-- 프로젝트별 WBS 통계 및 집계 정보
SELECT 
    -- 프로젝트 기본정보
    p.pjt_cd,
    p.pjt_nm,
    p.long_nm,
    p.system_sts_cd,
    p.cont_won_amt AS contract_amount,
    p.exe_begin_date,
    p.exe_end_date,
    
    -- WBS 집계 정보
    COUNT(w.wbs_cd) AS wbs_count,
    SUM(w.revenue_amt) AS total_wbs_revenue,
    MIN(w.wbs_start_de) AS earliest_wbs_start,
    MAX(w.wbs_end_de) AS latest_wbs_end,
    
    -- WBS 목록 문자열 (PostgreSQL)
    STRING_AGG(
        w.wbs_cd || ':' || COALESCE(w.wbs_desc, ''), 
        ', ' 
        ORDER BY w.wbs_cd
    ) AS wbs_list,
    
    -- WBS별 매출액 목록
    STRING_AGG(
        w.wbs_cd || '=' || COALESCE(w.revenue_amt::text, '0'), 
        ', ' 
        ORDER BY w.wbs_cd
    ) AS wbs_revenue_list,
    
    -- 원가처리 가능한 WBS 개수
    COUNT(CASE WHEN w.cost_able_yn = 'Y' THEN 1 END) AS active_wbs_count,
    
    -- 프로젝트 계약금액 vs WBS 총 매출액 비교
    p.cont_won_amt - SUM(COALESCE(w.revenue_amt, 0)) AS revenue_gap
    
FROM po_pjt_plan p
INNER JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

WHERE p.system_sts_cd IN ('PM003_진행중')

GROUP BY 
    p.pjt_cd,
    p.pjt_nm,
    p.long_nm,
    p.system_sts_cd,
    p.cont_won_amt,
    p.exe_begin_date,
    p.exe_end_date

HAVING COUNT(w.wbs_cd) > 0  -- WBS가 있는 프로젝트만

ORDER BY p.pjt_cd
```

**조회 결과 예시:**
```
pjt_cd  | pjt_nm      | wbs_count | total_wbs_revenue | active_wbs_count | wbs_list
--------|-------------|-----------|-------------------|------------------|---------------------------
PRJ001  | 프로젝트A    | 3         | 3500000          | 3                | WBS01:설계, WBS02:개발, WBS03:테스트
PRJ002  | 프로젝트B    | 2         | 5000000          | 2                | WBS01:분석, WBS02:구현
PRJ003  | 프로젝트C    | 1         | 2000000          | 1                | WBS01:컨설팅
```

**활용 사례:**
- 프로젝트 목록 대시보드 (WBS 개수, 총 매출액 표시)
- 프로젝트별 진행 현황 (가장 빠른/늦은 WBS 일정)
- 계약금액 vs WBS 매출액 합계 검증

---

## 2. po_pjt_plan + pm_wbs_mst 조인 결과로 접근 가능한 테이블들

### 2.1 pjt_cd만으로 조인 가능한 테이블

#### 2.1.1 계약 관련 테이블

| 테이블명 | PK | 조인 조건 | 관계 | 설명 |
|---------|----|---------|----|------|
| `po_contract` | pjt_cd | `p.pjt_cd = c.pjt_cd` | 1:1 | 프로젝트 계약 자료 메인 |
| `po_contract_chg` | pjt_cd, contract_no, seq_no | `p.pjt_cd = cc.pjt_cd` | 1:N | 프로젝트 계약 자료 변경 이력 |

**조회 가능한 주요 필드:**
- 계약번호, 계약금액(원화/외화), VAT, 환율
- 계약일자, 계약기간, 수주일
- 계약담당자, 계약부서
- 선수금율, 중도금, 잔금
- 지체상금율, 성능유보금비율
- 결재ID, 결재상태

```sql
-- 프로젝트 + WBS + 계약 정보
SELECT 
    p.pjt_cd, p.pjt_nm,
    w.wbs_cd, w.wbs_desc,
    c.contract_no,
    c.won_amt AS contract_amount,
    c.won_vat,
    c.contract_de,
    c.start_de,
    c.end_de
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd
LEFT JOIN po_contract c ON p.pjt_cd = c.pjt_cd
```

#### 2.1.2 실행계획 버전 테이블

| 테이블명 | PK | 조인 조건 | 관계 | 설명 |
|---------|----|---------|----|------|
| `pm_exe_plan_ver` | pjt_cd, ver | `p.pjt_cd = v.pjt_cd AND v.ver = p.exe_plan_ver` | 1:N | 실행계획 버전관리 |

**조회 가능한 주요 필드:**
- 실행계획 버전(ver)
- 실행시작일, 실행종료일
- 결재ID, 결재상태, 승인완료일
- BOQ 버전, 예산년도, 예산분류
- 과대재료비 발생년월

```sql
-- 프로젝트 + WBS + 현재 실행계획 버전
SELECT 
    p.pjt_cd, p.pjt_nm,
    w.wbs_cd, w.wbs_desc,
    v.ver AS current_version,
    v.exe_begin_date,
    v.exe_end_date,
    v.approval_sts_cd,
    v.apl_date AS approval_date
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd
LEFT JOIN pm_exe_plan_ver v ON p.pjt_cd = v.pjt_cd 
    AND v.ver = p.exe_plan_ver
```

#### 2.1.3 기타 프로젝트 관련 테이블

| 테이블명 | PK | 조인 조건 | 관계 | 설명 |
|---------|----|---------|----|------|
| `pm_key_mbr` | seq (auto) | `p.pjt_cd = km.pjt_cd` | 1:N | 프로젝트 Key Member |
| `po_plan_mth_mgt` | pjt_cd, plan_ver, wbs_cd, acct_dtt | `p.pjt_cd = pm.pjt_cd` | 1:N | 수주영업 월별 계획 |
| `pm_period_late_apply` | rls_ym, pjt_cd | `p.pjt_cd = pla.pjt_cd` | 1:N | 결재중 실적보관 대상 |

```sql
-- 프로젝트 + WBS + Key Member
SELECT 
    p.pjt_cd, p.pjt_nm,
    w.wbs_cd, w.wbs_desc,
    km.empno AS member_empno,
    e.emp_nm AS member_name,
    km.pjt_role_cd,
    km.job_dfw,
    km.begin_date,
    km.end_date
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd
LEFT JOIN pm_key_mbr km ON p.pjt_cd = km.pjt_cd
LEFT JOIN cm_emp e ON km.empno = e.empno
WHERE km.use_yn = 'Y'
```

---

### 2.2 pjt_cd + wbs_cd로 조인 가능한 테이블

#### 2.2.1 실적 데이터 테이블 (pm_xxx_rsl)

| 테이블명 | PK | 조인 조건 | 설명 |
|---------|----|---------|----|
| `pm_timecard` | pjt_cd, wbs_cd, empno, timecard_ym | `p.pjt_cd = tc.pjt_cd AND w.wbs_cd = tc.wbs_cd` | 타임카드(프로젝트) 입력 |
| `pm_comcst_othexp_rsl` | pjt_cd, wbs_cd, rsl_ym, cst_ele_cd | `p.pjt_cd = cor.pjt_cd AND w.wbs_cd = cor.wbs_cd` | 공통비+기타경비 실적 |
| `pm_ecst_rsl` | pjt_cd, wbs_cd, rsl_ym, sec_cst_ele_cd | `p.pjt_cd = er.pjt_cd AND w.wbs_cd = er.wbs_cd` | 경비실적 |
| `pm_lcst_prmpc_rsl` | pjt_cd, wbs_cd, rsl_ym, empno, sec_cst_ele_cd | `p.pjt_cd = lr.pjt_cd AND w.wbs_cd = lr.wbs_cd` | 노무비/인건비성경비 실적 |
| `pm_mcst_rsl` | pjt_cd, wbs_cd, acct_dtt, boq_po_set_no, rsl_ym, item_cd | `p.pjt_cd = mr.pjt_cd AND w.wbs_cd = mr.wbs_cd` | 재료비/협력작업비 실적 |
| `pm_revenue_cdit_rqst_rsl` | pjt_cd, wbs_cd, rsl_ym, sec_cst_ele_cd | `p.pjt_cd = rr.pjt_cd AND w.wbs_cd = rr.wbs_cd` | 월별 매출 실적 |

**실적 테이블 통합 조회 예시:**
```sql
-- 프로젝트 + WBS + 월별 실적 종합
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- 기준년월
    COALESCE(lr.rsl_ym, er.rsl_ym, mr.rsl_ym, rr.rsl_ym) AS rsl_ym,
    
    -- 노무비 실적
    SUM(lr.lcst_amt) AS labor_cost,
    SUM(lr.man_hour) AS man_hours,
    
    -- 경비 실적
    SUM(er.ecst_amt) AS expense_cost,
    
    -- 재료비/협력작업비 실적
    SUM(mr.rsl_amt) AS material_cost,
    
    -- 매출 실적
    SUM(rr.revenue_amt) AS revenue,
    
    -- 공통비 실적
    SUM(cor.rsl_amt) AS common_cost,
    
    -- 총 원가
    SUM(COALESCE(lr.lcst_amt, 0) + COALESCE(er.ecst_amt, 0) + 
        COALESCE(mr.rsl_amt, 0) + COALESCE(cor.rsl_amt, 0)) AS total_cost,
    
    -- 손익
    SUM(rr.revenue_amt) - 
    SUM(COALESCE(lr.lcst_amt, 0) + COALESCE(er.ecst_amt, 0) + 
        COALESCE(mr.rsl_amt, 0) + COALESCE(cor.rsl_amt, 0)) AS profit

FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 노무비 실적
LEFT JOIN pm_lcst_prmpc_rsl lr ON p.pjt_cd = lr.pjt_cd 
    AND w.wbs_cd = lr.wbs_cd

-- 경비 실적
LEFT JOIN pm_ecst_rsl er ON p.pjt_cd = er.pjt_cd 
    AND w.wbs_cd = er.wbs_cd
    AND er.rsl_ym = lr.rsl_ym

-- 재료비 실적
LEFT JOIN pm_mcst_rsl mr ON p.pjt_cd = mr.pjt_cd 
    AND w.wbs_cd = mr.wbs_cd
    AND mr.rsl_ym = lr.rsl_ym

-- 매출 실적
LEFT JOIN pm_revenue_cdit_rqst_rsl rr ON p.pjt_cd = rr.pjt_cd 
    AND w.wbs_cd = rr.wbs_cd
    AND rr.rsl_ym = lr.rsl_ym

-- 공통비 실적
LEFT JOIN pm_comcst_othexp_rsl cor ON p.pjt_cd = cor.pjt_cd 
    AND w.wbs_cd = cor.wbs_cd
    AND cor.rsl_ym = lr.rsl_ym

WHERE p.pjt_cd = 'PROJECT_CODE'
    AND lr.rsl_ym BETWEEN '202401' AND '202412'

GROUP BY 
    p.pjt_cd, p.pjt_nm, 
    w.wbs_cd, w.wbs_desc,
    COALESCE(lr.rsl_ym, er.rsl_ym, mr.rsl_ym, rr.rsl_ym)

ORDER BY 
    p.pjt_cd, w.wbs_cd, rsl_ym
```

---

### 2.3 pjt_cd + wbs_cd + ver로 조인 가능한 테이블

#### 2.3.1 계획 데이터 테이블 (pm_xxx_plan)

| 테이블명 | PK | 조인 조건 | 설명 |
|---------|----|---------|----|
| `pm_comcst_ym_plan` | pjt_cd, ver, wbs_cd, sec_cst_ele_cd, plan_ym | `p.pjt_cd = cp.pjt_cd AND w.wbs_cd = cp.wbs_cd AND p.exe_plan_ver = cp.ver` | 공통비 계획 |
| `pm_dclz_plan` | pjt_cd, ver, wbs_cd, plan_ym, empno | `p.pjt_cd = dp.pjt_cd AND w.wbs_cd = dp.wbs_cd AND p.exe_plan_ver = dp.ver` | 노무비 인력투입계획 |
| `pm_ecst_plan` | pjt_cd, ver, wbs_cd, plan_ym, sec_cst_ele_cd | `p.pjt_cd = ep.pjt_cd AND w.wbs_cd = ep.wbs_cd AND p.exe_plan_ver = ep.ver` | 경비계획 |
| `pm_mcst_plan` | pjt_cd, ver, wbs_cd, boq_po_set_no, plan_ym, acct_dtt, plan_ty_cd | `p.pjt_cd = mp.pjt_cd AND w.wbs_cd = mp.wbs_cd AND p.exe_plan_ver = mp.ver` | 재료비/협력작업비 계획 |
| `pm_tmplbr_lcst_plan` | pjt_cd, ver, wbs_cd, plan_ym | `p.pjt_cd = tp.pjt_cd AND w.wbs_cd = tp.wbs_cd AND p.exe_plan_ver = tp.ver` | 임시직 노무비 계획 |
| `pm_revenue_plan` | pjt_cd, ver, plan_ym, sec_cst_ele_cd, wbs_cd | `p.pjt_cd = rp.pjt_cd AND w.wbs_cd = rp.wbs_cd AND p.exe_plan_ver = rp.ver` | 월매출계획 |
| `pm_revenue_plan_wbs` | pjt_cd, ver, wbs_cd, plan_ym | `p.pjt_cd = rpw.pjt_cd AND w.wbs_cd = rpw.wbs_cd AND p.exe_plan_ver = rpw.ver` | 월별 WBS 매출계획 |
| `pm_pjt_exe_profit` | pjt_cd, wbs_cd, ver, plan_ym, cst_ele_cd, cst_dtl_nm | `p.pjt_cd = pep.pjt_cd AND w.wbs_cd = pep.wbs_cd AND p.exe_plan_ver = pep.ver` | 실행계획 손익종합 |
| `pm_pjt_exe_profit_hold` | pjt_cd, wbs_cd, ver, plan_ym, cst_ele_cd, cst_dtl_nm | `p.pjt_cd = peph.pjt_cd AND w.wbs_cd = peph.wbs_cd AND p.exe_plan_ver = peph.ver` | 결재중 손익실적 임시보관 |

**계획 테이블 통합 조회 예시:**
```sql
-- 프로젝트 + WBS + 월별 실행계획 종합
SELECT 
    p.pjt_cd, 
    p.pjt_nm, 
    w.wbs_cd, 
    w.wbs_desc,
    p.exe_plan_ver AS current_ver,
    
    -- 기준년월
    COALESCE(dp.plan_ym, ep.plan_ym, mp.plan_ym) AS plan_ym,
    
    -- 노무비 계획
    SUM(dp.man_month) AS plan_man_month,
    SUM(dp.lbr_amt) AS plan_labor_cost,
    SUM(dp.lbr_exp_amt) AS plan_labor_expense,
    
    -- 경비 계획
    SUM(ep.ecst_amt) AS plan_expense,
    
    -- 재료비/협력작업비 계획
    SUM(mp.plan_amt) AS plan_material_cost,
    
    -- 임시직 노무비 계획
    SUM(tp.lcst_amt) AS plan_temp_labor,
    
    -- 공통비 계획
    SUM(cp.comcst_amt) AS plan_common_cost,
    
    -- 매출 계획
    SUM(rp.revenue_amt) AS plan_revenue,
    
    -- 총 계획 원가
    SUM(COALESCE(dp.lbr_amt, 0) + COALESCE(dp.lbr_exp_amt, 0) +
        COALESCE(ep.ecst_amt, 0) + COALESCE(mp.plan_amt, 0) +
        COALESCE(tp.lcst_amt, 0) + COALESCE(cp.comcst_amt, 0)) AS plan_total_cost,
    
    -- 계획 손익
    SUM(rp.revenue_amt) - 
    SUM(COALESCE(dp.lbr_amt, 0) + COALESCE(dp.lbr_exp_amt, 0) +
        COALESCE(ep.ecst_amt, 0) + COALESCE(mp.plan_amt, 0) +
        COALESCE(tp.lcst_amt, 0) + COALESCE(cp.comcst_amt, 0)) AS plan_profit
    
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 노무비 계획
LEFT JOIN pm_dclz_plan dp ON p.pjt_cd = dp.pjt_cd 
    AND w.wbs_cd = dp.wbs_cd
    AND p.exe_plan_ver = dp.ver

-- 경비 계획
LEFT JOIN pm_ecst_plan ep ON p.pjt_cd = ep.pjt_cd 
    AND w.wbs_cd = ep.wbs_cd
    AND p.exe_plan_ver = ep.ver
    AND ep.plan_ym = dp.plan_ym

-- 재료비 계획
LEFT JOIN pm_mcst_plan mp ON p.pjt_cd = mp.pjt_cd 
    AND w.wbs_cd = mp.wbs_cd
    AND p.exe_plan_ver = mp.ver
    AND mp.plan_ym = dp.plan_ym

-- 임시직 노무비 계획
LEFT JOIN pm_tmplbr_lcst_plan tp ON p.pjt_cd = tp.pjt_cd 
    AND w.wbs_cd = tp.wbs_cd
    AND p.exe_plan_ver = tp.ver
    AND tp.plan_ym = dp.plan_ym

-- 공통비 계획
LEFT JOIN pm_comcst_ym_plan cp ON p.pjt_cd = cp.pjt_cd 
    AND w.wbs_cd = cp.wbs_cd
    AND p.exe_plan_ver = cp.ver
    AND cp.plan_ym = dp.plan_ym

-- 매출 계획
LEFT JOIN pm_revenue_plan rp ON p.pjt_cd = rp.pjt_cd 
    AND w.wbs_cd = rp.wbs_cd
    AND p.exe_plan_ver = rp.ver
    AND rp.plan_ym = dp.plan_ym

WHERE p.pjt_cd = 'PROJECT_CODE'

GROUP BY 
    p.pjt_cd, p.pjt_nm, 
    w.wbs_cd, w.wbs_desc,
    p.exe_plan_ver,
    COALESCE(dp.plan_ym, ep.plan_ym, mp.plan_ym)

ORDER BY 
    p.pjt_cd, w.wbs_cd, plan_ym
```

#### 2.3.2 VIEW 테이블

| VIEW명 | 기준 키 | 조인 조건 | 설명 |
|--------|--------|---------|------|
| `pm_dclz_plan_hv` | pjt_cd, ver, wbs_cd, plan_ym, empno | `p.pjt_cd = dph.pjt_cd AND w.wbs_cd = dph.wbs_cd AND p.exe_plan_ver = dph.ver` | MM Hold 실적포함 조회 |
| `pm_pjt_exe_profit_hv` | pjt_cd, wbs_cd, ver, plan_ym, cst_ele_cd, cst_dtl_nm | `p.pjt_cd = peph.pjt_cd AND w.wbs_cd = peph.wbs_cd AND p.exe_plan_ver = peph.ver` | 결재중 미반영 손익포함 손익 |
| `po_cont_est_profit_fst_v` | pjt_cd, wbs_cd | `p.pjt_cd = fst.pjt_cd AND w.wbs_cd = fst.wbs_cd` | 최초계약 손익 |
| `po_cont_est_profit_lst_v` | pjt_cd, wbs_cd | `p.pjt_cd = lst.pjt_cd AND w.wbs_cd = lst.wbs_cd` | 최종계약 손익 |

```sql
-- 프로젝트 + WBS + 손익 종합 (최초계약 vs 최종계약 vs 실행계획)
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- 최초계약 손익
    fst.po_f_rev_amt AS first_revenue,
    fst.po_f_lcost_amt + fst.po_f_mcost_amt + fst.po_f_ecost_amt + fst.po_f_hcost_amt AS first_cost,
    fst.po_f_biz_prof AS first_profit,
    
    -- 최종계약 손익
    lst.po_l_rev_amt AS last_revenue,
    lst.po_l_lcost_amt + lst.po_l_mcost_amt + lst.po_l_ecost_amt + lst.po_l_hcost_amt AS last_cost,
    lst.po_l_biz_prof AS last_profit,
    
    -- 실행계획 손익 (결재중 포함)
    SUM(CASE WHEN peph.cst_ele_cd = '10' THEN peph.now_ver_amt ELSE 0 END) AS exe_revenue,
    SUM(CASE WHEN peph.cst_ele_cd IN ('20','30','40','50') THEN peph.now_ver_amt ELSE 0 END) AS exe_cost,
    SUM(CASE WHEN peph.cst_ele_cd = '90' THEN peph.now_ver_amt ELSE 0 END) AS exe_profit

FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 최초계약 손익
LEFT JOIN po_cont_est_profit_fst_v fst ON p.pjt_cd = fst.pjt_cd 
    AND w.wbs_cd = fst.wbs_cd

-- 최종계약 손익
LEFT JOIN po_cont_est_profit_lst_v lst ON p.pjt_cd = lst.pjt_cd 
    AND w.wbs_cd = lst.wbs_cd

-- 실행계획 손익 (결재중 포함)
LEFT JOIN pm_pjt_exe_profit_hv peph ON p.pjt_cd = peph.pjt_cd 
    AND w.wbs_cd = peph.wbs_cd
    AND p.exe_plan_ver = peph.ver

WHERE p.pjt_cd = 'PROJECT_CODE'

GROUP BY 
    p.pjt_cd, p.pjt_nm, 
    w.wbs_cd, w.wbs_desc,
    fst.po_f_rev_amt, fst.po_f_lcost_amt, fst.po_f_mcost_amt, fst.po_f_ecost_amt, fst.po_f_hcost_amt, fst.po_f_biz_prof,
    lst.po_l_rev_amt, lst.po_l_lcost_amt, lst.po_l_mcost_amt, lst.po_l_ecost_amt, lst.po_l_hcost_amt, lst.po_l_biz_prof
```

---

### 2.4 po_pjt_plan의 각 필드로 조인 가능한 테이블

#### 2.4.1 공통코드 (cm_com_cd) 조인

| po_pjt_plan 필드 | ty_cd | 조인 조건 | 설명 |
|-----------------|-------|----------|------|
| `pjt_type_id` | PO011 | `c.ty_cd = 'PO011' AND c.com_cd = p.pjt_type_id` | 프로젝트 Type |
| `biz_sts_cd` | PO002 | `c.ty_cd = 'PO002' AND c.com_cd = p.biz_sts_cd` | 영업진행상태코드 |
| `system_sts_cd` | PM003 | `c.ty_cd = 'PM003' AND c.com_cd = p.system_sts_cd` | 프로젝트상태코드 |
| `strategy_biz_cd` | PO140 | `c.ty_cd = 'PO140' AND c.com_cd = p.strategy_biz_cd` | DX신사업 |

```sql
-- 프로젝트 + WBS + 모든 공통코드명
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- 공통코드명
    pt.com_cd_nm AS pjt_type_name,
    bs.com_cd_nm AS biz_status_name,
    ss.com_cd_nm AS system_status_name,
    sb.com_cd_nm AS strategy_biz_name
    
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 프로젝트타입
LEFT JOIN cm_com_cd pt ON pt.ty_cd = 'PO011' AND pt.com_cd = p.pjt_type_id

-- 영업진행상태
LEFT JOIN cm_com_cd bs ON bs.ty_cd = 'PO002' AND bs.com_cd = p.biz_sts_cd

-- 프로젝트상태
LEFT JOIN cm_com_cd ss ON ss.ty_cd = 'PM003' AND ss.com_cd = p.system_sts_cd

-- DX신사업
LEFT JOIN cm_com_cd sb ON sb.ty_cd = 'PO140' AND sb.com_cd = p.strategy_biz_cd
```

#### 2.4.2 고객사 정보 (po_cust_sites) 조인

| po_pjt_plan 필드 | po_cust_sites 필드 | 조인 조건 | 설명 |
|-----------------|-------------------|----------|------|
| `cust_no` | `cust_seq` | `cs.cust_seq = p.cust_no` | 고객사번호 (주 고객사) |
| `ori_cust_no` | `cust_seq` | `ocs.cust_seq = p.ori_cust_no` | 원발주처 고객사번호 |

```sql
-- 프로젝트 + WBS + 고객사 정보
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- 주 고객사 정보
    cs.brl_site_nm AS customer_name,
    cs.brl_site_no AS business_no,
    cs.brl_site_rep_nm AS rep_name,
    cs.site_phone_no AS customer_phone,
    cs.site_addr1 AS customer_addr,
    
    -- 원발주처 정보
    ocs.brl_site_nm AS origin_customer_name,
    ocs.brl_site_no AS origin_business_no
    
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 주 고객사
LEFT JOIN po_cust_sites cs ON cs.cust_seq = p.cust_no

-- 원발주처
LEFT JOIN po_cust_sites ocs ON ocs.cust_seq = p.ori_cust_no
```

#### 2.4.3 직원 정보 (cm_emp) 조인

| po_pjt_plan 필드 | cm_emp 필드 | 조인 조건 | 설명 |
|-----------------|-------------|----------|------|
| `biz_person_id` | `empno` | `e.empno = p.biz_person_id` | 영업사원번호 |
| `quote_req_person_id` | `empno` | `e.empno = p.quote_req_person_id` | 견적산출요청자 사번 |
| `estimate_person_id` | `empno` | `e.empno = p.estimate_person_id` | 견적담당자 사번 |
| `carrying_out_person_id` | `empno` | `e.empno = p.carrying_out_person_id` | 실행PM 사번 |
| `approver_id` | `empno` | `e.empno = p.approver_id` | 영업기회등록승인자 사번 |
| `as_reg_empno` | `empno` | `e.empno = p.as_reg_empno` | A/S등록 사번 |

```sql
-- 프로젝트 + WBS + 모든 담당자 정보
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- 영업사원
    biz_emp.emp_nm AS sales_name,
    biz_emp.email AS sales_email,
    biz_emp.mbtl_telno AS sales_mobile,
    biz_dept.dept_nm AS sales_dept,
    
    -- 견적담당자
    est_emp.emp_nm AS estimator_name,
    est_emp.email AS estimator_email,
    est_dept.dept_nm AS estimator_dept,
    
    -- 실행PM
    pm_emp.emp_nm AS pm_name,
    pm_emp.email AS pm_email,
    pm_emp.mbtl_telno AS pm_mobile,
    pm_dept.dept_nm AS pm_dept,
    pm_dept.dept_all_nm AS pm_dept_full
    
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 영업사원
LEFT JOIN cm_emp biz_emp ON biz_emp.empno = p.biz_person_id
LEFT JOIN cm_dept biz_dept ON biz_dept.dept_cd = biz_emp.dept_cd

-- 견적담당자
LEFT JOIN cm_emp est_emp ON est_emp.empno = p.estimate_person_id
LEFT JOIN cm_dept est_dept ON est_dept.dept_cd = est_emp.dept_cd

-- 실행PM
LEFT JOIN cm_emp pm_emp ON pm_emp.empno = p.carrying_out_person_id
LEFT JOIN cm_dept pm_dept ON pm_dept.dept_cd = pm_emp.dept_cd
```

#### 2.4.4 결재 정보 (cm_approval_trgter) 조인

| po_pjt_plan 필드 | cm_approval_trgter 필드 | 조인 조건 | 설명 |
|-----------------|----------------------|----------|------|
| `approval_id` | `approval_id` | `a.approval_id = p.approval_id` | 결재요청번호 |

```sql
-- 프로젝트 + WBS + 결재자 정보
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- 결재 정보
    a.approval_odr_no AS approval_order,
    a.approval_empno AS approver_empno,
    ae.emp_nm AS approver_name,
    a.approval_sts_cd,
    ast.com_cd_nm AS approval_status_name,
    a.approval_date,
    a.approval_time,
    a.approval_rsn AS approval_reason
    
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 결재자 정보
LEFT JOIN cm_approval_trgter a ON a.approval_id = p.approval_id

-- 결재자 사원 정보
LEFT JOIN cm_emp ae ON ae.empno = a.approval_empno

-- 결재상태 공통코드
LEFT JOIN cm_com_cd ast ON ast.ty_cd = 'CM080' AND ast.com_cd = a.approval_sts_cd

ORDER BY a.approval_odr_no
```

---

### 2.5 pm_wbs_mst의 각 필드로 조인 가능한 테이블

#### 2.5.1 부서 정보 (cm_dept) 조인

| pm_wbs_mst 필드 | cm_dept 필드 | 조인 조건 | 설명 |
|----------------|-------------|----------|------|
| `dept_cd` | `dept_cd` | `d.dept_cd = w.dept_cd` | WBS 담당 부서 |

```sql
-- 프로젝트 + WBS + 부서 정보
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- WBS 부서 정보
    d.dept_cd,
    d.dept_nm,
    d.dept_all_nm,
    d.upper_dept_cd,
    ud.dept_nm AS upper_dept_nm,
    d.dept_dtt_cd,
    d.revenue_yn
    
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- WBS 부서
LEFT JOIN cm_dept d ON d.dept_cd = w.dept_cd

-- 상위 부서
LEFT JOIN cm_dept ud ON ud.dept_cd = d.upper_dept_cd
```

#### 2.5.2 코스트센터 정보 (cm_costct_mst) 조인

| pm_wbs_mst 필드 | cm_costct_mst 필드 | 조인 조건 | 설명 |
|----------------|-------------------|----------|------|
| `costct_cd`, `costct_ty_cd` | `costct_cd`, `costct_ty_cd` | `c.costct_cd = w.costct_cd AND c.costct_ty_cd = w.costct_ty_cd` | WBS 코스트센터 |

```sql
-- 프로젝트 + WBS + 코스트센터 정보
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- 코스트센터 정보
    c.costct_cd,
    c.costct_ty_cd,
    c.costct_nm,
    c.costct_grp_cd,
    grp.com_cd_nm AS costct_grp_name,
    c.up_costct_cd,
    uc.costct_nm AS up_costct_nm,
    c.costct_loc_nm
    
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 코스트센터
LEFT JOIN cm_costct_mst c ON c.costct_cd = w.costct_cd 
    AND c.costct_ty_cd = w.costct_ty_cd

-- 코스트센터 그룹 (공통코드 BP043)
LEFT JOIN cm_com_cd grp ON grp.ty_cd = 'BP043' 
    AND grp.com_cd = c.costct_grp_cd

-- 상위 코스트센터
LEFT JOIN cm_costct_mst uc ON uc.costct_cd = c.up_costct_cd 
    AND uc.costct_ty_cd = c.costct_ty_cd
```

#### 2.5.3 WBS별 고객사 정보 (po_cust_sites) 조인

| pm_wbs_mst 필드 | po_cust_sites 필드 | 조인 조건 | 설명 |
|----------------|-------------------|----------|------|
| `wbs_cust_no` | `cust_seq` | `wcs.cust_seq = w.wbs_cust_no` | WBS별 고객사번호 |

```sql
-- 프로젝트 + WBS + WBS별 고객사 정보
SELECT 
    p.pjt_cd,
    p.pjt_nm,
    w.wbs_cd,
    w.wbs_desc,
    
    -- 프로젝트 주 고객사
    cs.brl_site_nm AS project_customer,
    
    -- WBS별 고객사 (다를 수 있음)
    wcs.brl_site_nm AS wbs_customer,
    wcs.brl_site_no AS wbs_customer_business_no,
    wcs.site_phone_no AS wbs_customer_phone
    
FROM po_pjt_plan p
JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 프로젝트 주 고객사
LEFT JOIN po_cust_sites cs ON cs.cust_seq = p.cust_no

-- WBS별 고객사
LEFT JOIN po_cust_sites wcs ON wcs.cust_seq = w.wbs_cust_no

WHERE w.wbs_cust_no IS NOT NULL  -- WBS별 고객사가 지정된 경우만
```

---

### 2.6 종합 조회 예시 (모든 관련 테이블 포함)

```sql
-- 프로젝트 완전 통합 조회 (프로젝트 + WBS + 모든 참조 테이블)
SELECT 
    -- 프로젝트 기본정보
    p.pjt_cd,
    p.pjt_nm,
    p.long_nm,
    pt.com_cd_nm AS pjt_type_name,
    bs.com_cd_nm AS biz_status_name,
    ss.com_cd_nm AS system_status_name,
    p.exe_begin_date,
    p.exe_end_date,
    p.exe_plan_ver,
    
    -- WBS 정보
    w.wbs_cd,
    w.wbs_desc,
    w.revenue_amt AS wbs_revenue,
    w.wbs_start_de,
    w.wbs_end_de,
    w.cost_able_yn,
    
    -- 고객사 정보
    cs.brl_site_nm AS customer_name,
    cs.brl_site_no AS business_no,
    cs.site_phone_no AS customer_phone,
    
    -- 실행PM 정보
    pm_emp.emp_nm AS pm_name,
    pm_emp.email AS pm_email,
    pm_dept.dept_nm AS pm_dept_name,
    
    -- 영업담당자 정보
    biz_emp.emp_nm AS sales_name,
    biz_emp.email AS sales_email,
    
    -- WBS 부서 정보
    wbs_dept.dept_nm AS wbs_dept_name,
    wbs_dept.dept_all_nm AS wbs_dept_full_name,
    
    -- 코스트센터 정보
    cc.costct_nm AS costcenter_name,
    cc.costct_grp_cd,
    
    -- 계약 정보
    c.contract_no,
    c.won_amt AS contract_amount,
    c.won_vat AS contract_vat,
    c.contract_de AS contract_date,
    
    -- 실행계획 버전 정보
    v.ver AS current_version,
    v.exe_begin_date AS ver_start_date,
    v.exe_end_date AS ver_end_date,
    v.approval_sts_cd AS ver_approval_status,
    
    -- 최초계약 손익
    fst.po_f_rev_amt AS first_contract_revenue,
    fst.po_f_biz_prof AS first_contract_profit,
    
    -- 최종계약 손익
    lst.po_l_rev_amt AS last_contract_revenue,
    lst.po_l_biz_prof AS last_contract_profit

FROM po_pjt_plan p

-- WBS (1:N 관계 - 프로젝트당 여러 WBS)
INNER JOIN pm_wbs_mst w ON p.pjt_cd = w.pjt_cd

-- 공통코드
LEFT JOIN cm_com_cd pt ON pt.ty_cd = 'PO011' AND pt.com_cd = p.pjt_type_id
LEFT JOIN cm_com_cd bs ON bs.ty_cd = 'PO002' AND bs.com_cd = p.biz_sts_cd
LEFT JOIN cm_com_cd ss ON ss.ty_cd = 'PM003' AND ss.com_cd = p.system_sts_cd

-- 고객사
LEFT JOIN po_cust_sites cs ON cs.cust_seq = p.cust_no

-- 실행PM
LEFT JOIN cm_emp pm_emp ON pm_emp.empno = p.carrying_out_person_id
LEFT JOIN cm_dept pm_dept ON pm_dept.dept_cd = pm_emp.dept_cd

-- 영업담당자
LEFT JOIN cm_emp biz_emp ON biz_emp.empno = p.biz_person_id

-- WBS 부서
LEFT JOIN cm_dept wbs_dept ON wbs_dept.dept_cd = w.dept_cd

-- 코스트센터
LEFT JOIN cm_costct_mst cc ON cc.costct_cd = w.costct_cd 
    AND cc.costct_ty_cd = w.costct_ty_cd

-- 계약 정보
LEFT JOIN po_contract c ON c.pjt_cd = p.pjt_cd

-- 실행계획 버전
LEFT JOIN pm_exe_plan_ver v ON v.pjt_cd = p.pjt_cd 
    AND v.ver = p.exe_plan_ver

-- 최초계약 손익
LEFT JOIN po_cont_est_profit_fst_v fst ON fst.pjt_cd = p.pjt_cd 
    AND fst.wbs_cd = w.wbs_cd

-- 최종계약 손익
LEFT JOIN po_cont_est_profit_lst_v lst ON lst.pjt_cd = p.pjt_cd 
    AND lst.wbs_cd = w.wbs_cd

WHERE p.pjt_cd = 'PROJECT_CODE'
  AND w.cost_able_yn = 'Y'

ORDER BY p.pjt_cd, w.wbs_cd
```

---