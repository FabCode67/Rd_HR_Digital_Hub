#!/usr/bin/env python
"""
seed_data.py — Seed realistic bank HR data for Rwanda HR Digital Hub.

Hierarchy:
  Executive Office  (root department — headed by Managing Director)
  ├── Business Division
  │   ├── Retail Banking
  │   │   └── Bancassurance
  │   ├── Corporate Banking
  │   │   └── Trade Finance
  │   ├── Treasury
  │   └── Digital Banking
  ├── Operations Division
  │   ├── Branch Operations
  │   │   ├── Customer Experience
  │   │   └── Cash Management
  │   ├── Card Operations
  │   └── Clearing & Settlement
  ├── Finance & Risk Division
  │   ├── Finance
  │   ├── Credit Risk
  │   ├── Internal Audit
  │   └── Compliance
  ├── Technology Division
  │   ├── IT Department
  │   │   ├── IT Applications
  │   │   ├── IT Infrastructure
  │   │   └── IT Security
  │   └── Data & Analytics
  └── People & Support Division
      ├── Human Resources
      └── Legal

Usage (from server/ directory):
    python seed_data.py               # seed everything
    python seed_data.py --clear       # wipe + reseed
    python seed_data.py --clear-only  # wipe only
"""

import sys
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from dateutil.relativedelta import relativedelta

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import SessionLocal
from app.models.models import (
    OrgFunction, Department, Position, Employee, EmployeePosition,
    EmployeeStatus, UserRole, EducationRecord,
    LeaveAllocation, LeaveRecord,
)
from app.services.auth_service import get_password_hash

# ── helpers ───────────────────────────────────────────────────────────────────
def uid():   return uuid.uuid4()
def dt(y, m, d): return datetime(y, m, d)

def working_days(start, end):
    count, cur = 0, start
    while cur <= end:
        if cur.weekday() < 5: count += 1
        cur += timedelta(days=1)
    return max(count, 1)

DEFAULT_PASSWORD = get_password_hash("NCBAStaff@123")

# =============================================================================
# DATA DEFINITIONS
# =============================================================================

# ── 1. Business Functions ─────────────────────────────────────────────────────
FUNCTIONS = [
    dict(name="Executive",       description="Top-level executive leadership",              color="#1e293b"),
    dict(name="Business",        description="Revenue-generating business units",           color="#06b6d4"),
    dict(name="Operations",      description="Day-to-day operational support",              color="#10b981"),
    dict(name="Finance & Risk",  description="Financial management and risk oversight",     color="#f59e0b"),
    dict(name="Technology",      description="IT infrastructure and digital banking",       color="#8b5cf6"),
    dict(name="People & Support",description="Human resources, legal and compliance",       color="#ef4444"),
]

# ── 2. Departments ────────────────────────────────────────────────────────────
# (name, description, function_name, parent_name)
# parent_name=None  →  root (only "Executive Office" should be root)
DEPARTMENTS = [
    # ── ROOT ──────────────────────────────────────────────────────────────────
    ("Executive Office",        "Top-level executive office headed by the MD",  "Executive",        None),

    # ── Level-1 Divisions (children of Executive Office) ─────────────────────
    ("Business Division",       "All revenue-generating business units",        "Business",         "Executive Office"),
    ("Operations Division",     "Operational and service delivery units",       "Operations",       "Executive Office"),
    ("Finance & Risk Division", "Finance, risk, audit and compliance",          "Finance & Risk",   "Executive Office"),
    ("Technology Division",     "IT and digital technology units",              "Technology",       "Executive Office"),
    ("People & Support Division","HR, legal and support functions",             "People & Support", "Executive Office"),

    # ── Business children ─────────────────────────────────────────────────────
    ("Retail Banking",          "Personal and SME banking services",            "Business",         "Business Division"),
    ("Corporate Banking",       "Large corporate client banking",               "Business",         "Business Division"),
    ("Treasury",                "Liquidity, FX and investments",                "Business",         "Business Division"),
    ("Digital Banking",         "Mobile and internet banking channels",         "Business",         "Business Division"),
    ("Bancassurance",           "Insurance products distribution",              "Business",         "Retail Banking"),
    ("Trade Finance",           "Import/export and trade products",             "Business",         "Corporate Banking"),

    # ── Operations children ───────────────────────────────────────────────────
    ("Branch Operations",       "Branch network management",                    "Operations",       "Operations Division"),
    ("Card Operations",         "Debit and credit card operations",             "Operations",       "Operations Division"),
    ("Clearing & Settlement",   "Payment clearing and reconciliation",          "Operations",       "Operations Division"),
    ("Customer Experience",     "Customer service and complaints",              "Operations",       "Branch Operations"),
    ("Cash Management",         "Physical cash handling and vault management",  "Operations",       "Branch Operations"),

    # ── Finance & Risk children ───────────────────────────────────────────────
    ("Finance",                 "Financial reporting and accounts",             "Finance & Risk",   "Finance & Risk Division"),
    ("Credit Risk",             "Loan underwriting and credit assessment",      "Finance & Risk",   "Finance & Risk Division"),
    ("Internal Audit",          "Independent assurance and audit",              "Finance & Risk",   "Finance & Risk Division"),
    ("Compliance",              "Regulatory compliance and AML/KYC",            "Finance & Risk",   "Finance & Risk Division"),

    # ── Technology children ───────────────────────────────────────────────────
    ("IT Department",           "Overall IT management and governance",         "Technology",       "Technology Division"),
    ("IT Applications",         "Core banking and application management",      "Technology",       "IT Department"),
    ("IT Infrastructure",       "Servers, networks and data centres",           "Technology",       "IT Department"),
    ("IT Security",             "Cybersecurity and data protection",            "Technology",       "IT Department"),
    ("Data & Analytics",        "Business intelligence and reporting",          "Technology",       "Technology Division"),

    # ── People & Support children ─────────────────────────────────────────────
    ("Human Resources",         "Talent acquisition, L&D and HR operations",   "People & Support", "People & Support Division"),
    ("Legal",                   "Legal counsel and contract management",        "People & Support", "People & Support Division"),
]

# ── 3. Positions ──────────────────────────────────────────────────────────────
# (title, level, band, department_name, parent_position_title)
POSITIONS = [
    # ── Executive Office ──────────────────────────────────────────────────────
    ("Managing Director",               "Managing Director",  "E1", "Executive Office",        None),
    ("Executive Director – Business",   "Executive Director", "E2", "Business Division",       "Managing Director"),
    ("Executive Director – Operations", "Executive Director", "E2", "Operations Division",     "Managing Director"),
    ("Executive Director – Finance",    "Executive Director", "E2", "Finance & Risk Division", "Managing Director"),
    ("Executive Director – Technology", "Executive Director", "E2", "Technology Division",     "Managing Director"),
    ("Executive Director – People",     "Executive Director", "E2", "People & Support Division","Managing Director"),

    # ── Business Division ─────────────────────────────────────────────────────
    ("Head of Retail Banking",          "Head of Department", "B1", "Retail Banking",          "Executive Director – Business"),
    ("Head of Corporate Banking",       "Head of Department", "B1", "Corporate Banking",       "Executive Director – Business"),
    ("Head of Treasury",                "Head of Department", "B1", "Treasury",                "Executive Director – Business"),
    ("Head of Digital Banking",         "Head of Department", "B1", "Digital Banking",         "Executive Director – Business"),

    ("Senior Manager – Personal Banking","Senior Manager",    "B2", "Retail Banking",          "Head of Retail Banking"),
    ("Senior Manager – SME Banking",    "Senior Manager",     "B2", "Retail Banking",          "Head of Retail Banking"),
    ("Personal Banking Officer",        "Officer",            "B4", "Retail Banking",          "Senior Manager – Personal Banking"),
    ("SME Banking Officer",             "Officer",            "B4", "Retail Banking",          "Senior Manager – SME Banking"),
    ("Bancassurance Officer",           "Officer",            "B4", "Bancassurance",           "Head of Retail Banking"),

    ("Relationship Manager – Corporate","Manager",            "B3", "Corporate Banking",       "Head of Corporate Banking"),
    ("Corporate Banking Officer",       "Officer",            "B4", "Corporate Banking",       "Relationship Manager – Corporate"),
    ("Trade Finance Manager",           "Manager",            "B3", "Trade Finance",           "Head of Corporate Banking"),
    ("Trade Finance Officer",           "Officer",            "B4", "Trade Finance",           "Trade Finance Manager"),

    ("Treasury Dealer",                 "Senior Officer",     "B3", "Treasury",                "Head of Treasury"),
    ("Treasury Officer",                "Officer",            "B4", "Treasury",                "Treasury Dealer"),

    ("Digital Product Manager",         "Manager",            "B3", "Digital Banking",         "Head of Digital Banking"),
    ("Digital Banking Officer",         "Officer",            "B4", "Digital Banking",         "Digital Product Manager"),

    # ── Operations Division ───────────────────────────────────────────────────
    ("Head of Branch Operations",       "Head of Department", "O1", "Branch Operations",       "Executive Director – Operations"),
    ("Head of Card Operations",         "Head of Department", "O1", "Card Operations",         "Executive Director – Operations"),
    ("Head of Clearing & Settlement",   "Head of Department", "O1", "Clearing & Settlement",   "Executive Director – Operations"),

    ("Branch Manager – Kigali CBD",     "Manager",            "O2", "Branch Operations",       "Head of Branch Operations"),
    ("Branch Manager – Nyamirambo",     "Manager",            "O2", "Branch Operations",       "Head of Branch Operations"),
    ("Customer Experience Officer",     "Officer",            "O3", "Customer Experience",     "Head of Branch Operations"),
    ("Cash Officer",                    "Officer",            "O3", "Cash Management",         "Head of Branch Operations"),
    ("Card Operations Officer",         "Officer",            "O3", "Card Operations",         "Head of Card Operations"),
    ("Clearing Officer",                "Officer",            "O3", "Clearing & Settlement",   "Head of Clearing & Settlement"),

    # ── Finance & Risk Division ───────────────────────────────────────────────
    ("Chief Finance Officer",           "Director",           "F1", "Finance",                 "Executive Director – Finance"),
    ("Chief Risk Officer",              "Director",           "F1", "Credit Risk",             "Executive Director – Finance"),
    ("Head of Finance",                 "Head of Department", "F2", "Finance",                 "Chief Finance Officer"),
    ("Head of Credit Risk",             "Head of Department", "F2", "Credit Risk",             "Chief Risk Officer"),
    ("Head of Internal Audit",          "Head of Department", "F2", "Internal Audit",          "Executive Director – Finance"),
    ("Head of Compliance",              "Head of Department", "F2", "Compliance",              "Executive Director – Finance"),

    ("Senior Finance Officer",          "Senior Officer",     "F3", "Finance",                 "Head of Finance"),
    ("Finance Officer",                 "Officer",            "F4", "Finance",                 "Senior Finance Officer"),
    ("Credit Analyst",                  "Officer",            "F4", "Credit Risk",             "Head of Credit Risk"),
    ("Compliance Officer",              "Officer",            "F4", "Compliance",              "Head of Compliance"),
    ("Internal Auditor",                "Officer",            "F4", "Internal Audit",          "Head of Internal Audit"),

    # ── Technology Division ───────────────────────────────────────────────────
    ("Chief Technology Officer",        "Director",           "T1", "IT Department",           "Executive Director – Technology"),

    # IT Department → Head of IT
    ("Head of IT",                      "Head of Department", "T2", "IT Department",           "Chief Technology Officer"),

    # IT Applications (reports to Head of IT)
    ("Senior Manager – IT Applications","Senior Manager",     "T3", "IT Applications",         "Head of IT"),
    ("T24 Developer Assistant Manager", "Assistant Manager",  "T4", "IT Applications",         "Senior Manager – IT Applications"),
    ("T24 Officer",                     "Officer",            "T5", "IT Applications",         "T24 Developer Assistant Manager"),
    ("IT Applications Officer",         "Officer",            "T5", "IT Applications",         "Senior Manager – IT Applications"),
    ("Graduate Trainee – IT",           "Graduate Trainee",   "T6", "IT Applications",         "Senior Manager – IT Applications"),

    # IT Infrastructure (reports to Head of IT)
    ("Senior Manager – IT Infrastructure","Senior Manager",   "T3", "IT Infrastructure",       "Head of IT"),
    ("Network Engineer",                "Assistant Manager",  "T4", "IT Infrastructure",       "Senior Manager – IT Infrastructure"),
    ("Systems Officer",                 "Officer",            "T5", "IT Infrastructure",       "Senior Manager – IT Infrastructure"),

    # IT Security (reports to Head of IT)
    ("Senior Manager – IT Security",    "Senior Manager",     "T3", "IT Security",             "Head of IT"),
    ("Cybersecurity Analyst",           "Officer",            "T5", "IT Security",             "Senior Manager – IT Security"),

    # Data & Analytics
    ("Head of Data & Analytics",        "Head of Department", "T2", "Data & Analytics",        "Chief Technology Officer"),
    ("Data Analyst",                    "Officer",            "T4", "Data & Analytics",        "Head of Data & Analytics"),

    # ── People & Support Division ─────────────────────────────────────────────
    ("Head of Human Resources",         "Head of Department", "P1", "Human Resources",         "Executive Director – People"),
    ("Head of Legal",                   "Head of Department", "P1", "Legal",                   "Executive Director – People"),

    ("HR Business Partner",             "Senior Manager",     "P2", "Human Resources",         "Head of Human Resources"),
    ("Talent Acquisition Officer",      "Officer",            "P3", "Human Resources",         "HR Business Partner"),
    ("HR Officer",                      "Officer",            "P3", "Human Resources",         "Head of Human Resources"),
    ("Legal Officer",                   "Officer",            "P3", "Legal",                   "Head of Legal"),
    ("Graduate Trainee – HR",           "Graduate Trainee",   "P4", "Human Resources",         "HR Business Partner"),
]

# ── 4. Employees ──────────────────────────────────────────────────────────────
# (full_name, email, phone, dob, national_id, emp_type, past_employer, past_position)
EMPLOYEES = [
    # Executives
    ("John Uwimana",          "j.uwimana@ncba.rw",        "+250 788 001 001","1970-03-15","1197003150001","permanent","BPR Bank",          "Executive Director"),
    ("Grace Mutoni",          "g.mutoni@ncba.rw",         "+250 788 001 002","1975-07-22","1197507220002","permanent","I&M Bank Rwanda",   "Director Business"),
    ("Eric Niyibizi",         "e.niyibizi@ncba.rw",       "+250 788 001 003","1978-11-08","1197811080003","permanent","Equity Bank",       "Head of Operations"),
    ("Christine Uwase",       "c.uwase@ncba.rw",          "+250 788 004 001","1977-02-14","1197702140014","permanent","PwC Rwanda",        "Finance Manager"),
    ("David Mugisha",         "d.mugisha@ncba.rw",        "+250 788 005 001","1981-05-30","1198105300019","permanent","MTN Rwanda",        "IT Director"),
    ("Theophile Munyaneza",   "t.munyaneza@ncba.rw",      "+250 788 006 001","1980-01-19","1198001190023","permanent","Workforce Dev",     "HR Manager"),
    # Business
    ("Alice Umutoni",         "a.umutoni@ncba.rw",        "+250 788 002 001","1982-05-14","1198205140004","permanent","Bank of Kigali",    "Senior Manager"),
    ("Patrick Habimana",      "p.habimana@ncba.rw",       "+250 788 002 002","1985-09-30","1198509300005","permanent","KCB Rwanda",        "Relationship Manager"),
    ("Diane Ingabire",        "d.ingabire@ncba.rw",       "+250 788 002 003","1988-01-25","1198801250006","permanent","Cogebanque",        "Trade Finance Officer"),
    ("Samuel Nkurunziza",     "s.nkurunziza@ncba.rw",     "+250 788 002 004","1983-06-12","1198306120007","permanent","BRD",               "Treasury Analyst"),
    ("Josiane Mukamana",      "j.mukamana@ncba.rw",       "+250 788 002 005","1990-04-18","1199004180008","permanent","Urwego Bank",       "Digital Officer"),
    # Operations
    ("Robert Gatete",         "r.gatete@ncba.rw",         "+250 788 003 001","1980-08-05","1198008050009","permanent","Equity Bank",       "Branch Manager"),
    ("Solange Nyiraneza",     "s.nyiraneza@ncba.rw",      "+250 788 003 002","1986-12-20","1198612200010","permanent","CLECAM",            "Card Ops Officer"),
    ("Jean Damascene",        "jd.uwitonze@ncba.rw",      "+250 788 003 003","1989-03-07","1198903070011","permanent","BPRL",              "Clearing Officer"),
    ("Yvonne Uwineza",        "y.uwineza@ncba.rw",        "+250 788 003 004","1991-11-15","1199111150012","permanent","Bank of Kigali",    "Customer Service"),
    ("Felix Nzeyimana",       "f.nzeyimana@ncba.rw",      "+250 788 003 005","1987-07-28","1198707280013","permanent","Banque Populaire",  "Cash Officer"),
    # Finance & Risk
    ("Bruno Hakizimana",      "b.hakizimana@ncba.rw",     "+250 788 004 002","1979-10-03","1197910030015","permanent","MINECOFIN",         "Risk Director"),
    ("Aline Nyinawumuntu",    "al.nyinawumuntu@ncba.rw",  "+250 788 004 003","1984-06-22","1198406220016","permanent","EY Rwanda",         "Senior Auditor"),
    ("Innocent Hakizayo",     "i.hakizayo@ncba.rw",       "+250 788 004 004","1992-09-09","1199209090017","permanent","BNRI",              "Compliance Officer"),
    ("Celine Iradukunda",     "c.iradukunda@ncba.rw",     "+250 788 004 005","1993-02-17","1199302170018","permanent","Deloitte Rwanda",   "Credit Analyst"),
    # Technology
    ("Sandrine Mukamurenzi",  "s.mukamurenzi@ncba.rw",    "+250 788 005 002","1986-08-14","1198608140020","permanent","Irembo",            "Systems Engineer"),
    ("Herve Nkusi",           "h.nkusi@ncba.rw",          "+250 788 005 003","1991-04-21","1199104210021","permanent","Airtel Rwanda",     "Security Analyst"),
    ("Marie Claire Uwera",    "mc.uwera@ncba.rw",         "+250 788 005 004","1994-12-05","1199412050022","permanent",None,                None),
    ("Emmanuel Bizimana",     "e.bizimana@ncba.rw",       "+250 788 005 005","1993-08-17","1199308170029","permanent","RwandaOnline",      "Network Engineer"),
    # People & Support
    ("Odette Nziza",          "o.nziza@ncba.rw",          "+250 788 006 002","1985-03-08","1198503080024","permanent","Rwanda Law Society","Legal Counsel"),
    ("Pascal Habiyaremye",    "p.habiyaremye@ncba.rw",    "+250 788 006 003","1990-07-16","1199007160025","permanent","BK Group",          "HR Business Partner"),
    ("Claudine Umutoniwase",  "cl.umutoniwase@ncba.rw",   "+250 788 006 004","1995-10-25","1199510250026","permanent",None,                None),
    # Temporary / trainees
    ("Kevin Niyonsaba",       "k.niyonsaba@ncba.rw",      "+250 788 007 001","1999-06-14","1199906140027","temporary",None,                None),
    ("Annette Kalisa",        "an.kalisa@ncba.rw",        "+250 788 007 002","1998-08-22","1199808220028","temporary",None,                None),
]

# ── 5. Position assignments + promotions ──────────────────────────────────────
# (email, position_title, start_date, is_current)
ASSIGNMENTS = [
    # ── Executives ────────────────────────────────────────────────────────────
    ("j.uwimana@ncba.rw",       "Managing Director",                   dt(2019,1,2),  True),
    ("g.mutoni@ncba.rw",        "Executive Director – Business",       dt(2020,3,1),  True),
    ("e.niyibizi@ncba.rw",      "Executive Director – Operations",     dt(2020,3,1),  True),
    ("c.uwase@ncba.rw",         "Executive Director – Finance",        dt(2017,2,1),  True),
    ("d.mugisha@ncba.rw",       "Executive Director – Technology",     dt(2018,7,1),  True),
    ("t.munyaneza@ncba.rw",     "HR Business Partner",                 dt(2016,5,1),  False),  # promoted
    ("t.munyaneza@ncba.rw",     "Executive Director – People",         dt(2020,1,1),  True),

    # ── Business ──────────────────────────────────────────────────────────────
    ("a.umutoni@ncba.rw",       "Senior Manager – Personal Banking",   dt(2018,6,1),  False),  # promoted
    ("a.umutoni@ncba.rw",       "Head of Retail Banking",              dt(2022,1,1),  True),
    ("p.habimana@ncba.rw",      "Relationship Manager – Corporate",    dt(2017,4,1),  False),  # promoted
    ("p.habimana@ncba.rw",      "Head of Corporate Banking",           dt(2021,7,1),  True),
    ("s.nkurunziza@ncba.rw",    "Treasury Dealer",                     dt(2019,9,1),  False),  # promoted
    ("s.nkurunziza@ncba.rw",    "Head of Treasury",                    dt(2023,1,1),  True),
    ("j.mukamana@ncba.rw",      "Digital Product Manager",             dt(2020,2,1),  False),  # promoted
    ("j.mukamana@ncba.rw",      "Head of Digital Banking",             dt(2024,1,1),  True),
    ("d.ingabire@ncba.rw",      "Trade Finance Manager",               dt(2019,5,1),  True),

    # ── Operations ────────────────────────────────────────────────────────────
    ("r.gatete@ncba.rw",        "Branch Manager – Kigali CBD",         dt(2018,3,1),  False),  # promoted
    ("r.gatete@ncba.rw",        "Head of Branch Operations",           dt(2022,6,1),  True),
    ("s.nyiraneza@ncba.rw",     "Card Operations Officer",             dt(2019,1,1),  False),  # promoted
    ("s.nyiraneza@ncba.rw",     "Head of Card Operations",             dt(2023,7,1),  True),
    ("jd.uwitonze@ncba.rw",     "Clearing Officer",                    dt(2020,5,1),  True),
    ("y.uwineza@ncba.rw",       "Customer Experience Officer",         dt(2021,8,1),  True),
    ("f.nzeyimana@ncba.rw",     "Cash Officer",                        dt(2018,11,1), True),

    # ── Finance & Risk ─────────────────────────────────────────────────────────
    ("b.hakizimana@ncba.rw",    "Chief Risk Officer",                  dt(2018,1,1),  True),
    ("al.nyinawumuntu@ncba.rw", "Head of Internal Audit",              dt(2019,4,1),  True),
    ("i.hakizayo@ncba.rw",      "Compliance Officer",                  dt(2020,9,1),  True),
    ("c.iradukunda@ncba.rw",    "Credit Analyst",                      dt(2021,6,1),  True),

    # ── Technology ────────────────────────────────────────────────────────────
    ("s.mukamurenzi@ncba.rw",   "Senior Manager – IT Infrastructure",  dt(2019,3,1),  True),
    ("h.nkusi@ncba.rw",         "Senior Manager – IT Security",        dt(2020,11,1), True),
    ("mc.uwera@ncba.rw",        "Data Analyst",                        dt(2022,8,1),  True),
    ("e.bizimana@ncba.rw",      "Network Engineer",                    dt(2021,4,1),  True),
    ("k.niyonsaba@ncba.rw",     "Graduate Trainee – IT",               dt(2025,1,6),  True),

    # ── People & Support ──────────────────────────────────────────────────────
    ("o.nziza@ncba.rw",         "Head of Legal",                       dt(2019,8,1),  True),
    ("p.habiyaremye@ncba.rw",   "HR Business Partner",                 dt(2021,3,1),  True),
    ("cl.umutoniwase@ncba.rw",  "Talent Acquisition Officer",          dt(2022,5,1),  True),
    ("an.kalisa@ncba.rw",       "Graduate Trainee – HR",               dt(2025,1,6),  True),
]

# ── 6. Education records ──────────────────────────────────────────────────────
# (email, record_type, title, institution, start_yr, end_yr, grade)
EDUCATION = [
    ("j.uwimana@ncba.rw",       "degree",        "MBA Finance",                    "University of Rwanda",        2005,2007,"Distinction"),
    ("g.mutoni@ncba.rw",        "degree",        "BSc Banking & Finance",          "KIM University",              2000,2004,"Upper Second"),
    ("g.mutoni@ncba.rw",        "certification", "ACCA",                           "ICPAR Rwanda",                2006,2009,"Full Member"),
    ("e.niyibizi@ncba.rw",      "degree",        "BSc Business Administration",    "INES Ruhengeri",              1999,2003,"Upper Second"),
    ("e.niyibizi@ncba.rw",      "training",      "Leadership Excellence Program",  "Strathmore Business School",  2018,2018,"Completed"),
    ("c.uwase@ncba.rw",         "degree",        "BCom Accounting",                "University of Rwanda",        2000,2004,"First Class"),
    ("c.uwase@ncba.rw",         "certification", "CPA",                            "ICPAR Rwanda",                2005,2008,"Full Member"),
    ("b.hakizimana@ncba.rw",    "degree",        "BSc Economics",                  "National University Rwanda",  2001,2005,"Upper Second"),
    ("b.hakizimana@ncba.rw",    "certification", "FRM",                            "GARP",                        2010,2011,"Pass"),
    ("d.mugisha@ncba.rw",       "degree",        "BSc Computer Science",           "KIST Rwanda",                 2001,2005,"First Class"),
    ("d.mugisha@ncba.rw",       "certification", "CISSP",                          "ISC²",                        2015,2016,"Pass"),
    ("s.mukamurenzi@ncba.rw",   "certification", "CCNA",                           "Cisco Academy",               2018,2018,"Pass"),
    ("h.nkusi@ncba.rw",         "certification", "CEH",                            "EC-Council",                  2021,2021,"Pass"),
    ("t.munyaneza@ncba.rw",     "degree",        "BA Human Resource Management",   "University of Rwanda",        2003,2007,"Upper Second"),
    ("t.munyaneza@ncba.rw",     "certification", "CIPD Level 5",                   "CIPD UK",                     2015,2017,"Merit"),
    ("al.nyinawumuntu@ncba.rw", "certification", "CIA",                            "IIA Global",                  2017,2019,"Pass"),
    ("i.hakizayo@ncba.rw",      "certification", "CAMS",                           "ACAMS",                       2022,2023,"Pass"),
    ("o.nziza@ncba.rw",         "degree",        "LLB Law",                        "University of Rwanda",        2005,2009,"Upper Second"),
    ("o.nziza@ncba.rw",         "degree",        "LLM Banking Law",                "University of Cape Town",     2011,2013,"Pass"),
    ("c.iradukunda@ncba.rw",    "training",      "Credit Analysis Bootcamp",       "Bank of Kigali Academy",      2021,2022,"Completed"),
    ("e.bizimana@ncba.rw",      "certification", "CCNP",                           "Cisco Academy",               2022,2023,"Pass"),
    ("mc.uwera@ncba.rw",        "degree",        "BSc Statistics",                 "University of Rwanda",        2014,2018,"Upper Second"),
]

# ── 7. Leave records ──────────────────────────────────────────────────────────
# (email, leave_type, start_date, end_date, notes)
LEAVES = [
    # 2025
    ("a.umutoni@ncba.rw",       "annual",        dt(2025,1,6),  dt(2025,1,10), "New Year break"),
    ("p.habimana@ncba.rw",      "annual",        dt(2025,2,3),  dt(2025,2,14), "Family vacation"),
    ("r.gatete@ncba.rw",        "annual",        dt(2025,3,17), dt(2025,3,28), "Annual leave"),
    ("c.uwase@ncba.rw",         "annual",        dt(2025,4,7),  dt(2025,4,11), "Short break"),
    ("d.mugisha@ncba.rw",       "annual",        dt(2025,5,5),  dt(2025,5,16), "Annual vacation"),
    ("t.munyaneza@ncba.rw",     "annual",        dt(2025,6,2),  dt(2025,6,6),  "Annual leave"),
    ("j.mukamana@ncba.rw",      "annual",        dt(2025,7,7),  dt(2025,7,18), "Annual vacation"),
    ("s.nkurunziza@ncba.rw",    "annual",        dt(2025,8,4),  dt(2025,8,15), "Annual leave"),
    ("y.uwineza@ncba.rw",       "sick",          dt(2025,3,3),  dt(2025,3,7),  "Malaria treatment"),
    ("jd.uwitonze@ncba.rw",     "sick",          dt(2025,5,12), dt(2025,5,16), "Medical leave"),
    ("d.ingabire@ncba.rw",      "maternity",     dt(2025,6,2),  dt(2025,9,2),  "Maternity leave"),
    ("cl.umutoniwase@ncba.rw",  "sick",          dt(2025,4,14), dt(2025,4,16), "Flu"),
    ("p.habiyaremye@ncba.rw",   "paternity",     dt(2025,7,1),  dt(2025,7,14), "Paternity leave"),
    ("al.nyinawumuntu@ncba.rw", "compassionate", dt(2025,8,18), dt(2025,8,22), "Bereavement – parent"),
    ("i.hakizayo@ncba.rw",      "annual",        dt(2025,9,8),  dt(2025,9,12), "Annual leave"),
    ("h.nkusi@ncba.rw",         "annual",        dt(2025,10,6), dt(2025,10,10),"Annual leave"),
    ("s.mukamurenzi@ncba.rw",   "sick",          dt(2025,11,3), dt(2025,11,7), "Back pain"),
    ("f.nzeyimana@ncba.rw",     "annual",        dt(2025,11,17),dt(2025,11,21),"Annual leave"),
    # 2026
    ("a.umutoni@ncba.rw",       "annual",        dt(2026,1,5),  dt(2026,1,9),  "New Year break"),
    ("g.mutoni@ncba.rw",        "annual",        dt(2026,2,2),  dt(2026,2,13), "Annual vacation"),
    ("b.hakizimana@ncba.rw",    "annual",        dt(2026,3,2),  dt(2026,3,6),  "Short break"),
    ("mc.uwera@ncba.rw",        "sick",          dt(2026,2,23), dt(2026,2,27), "Medical leave"),
    ("o.nziza@ncba.rw",         "annual",        dt(2026,4,6),  dt(2026,4,10), "Annual leave"),
    ("c.iradukunda@ncba.rw",    "annual",        dt(2026,5,4),  dt(2026,5,8),  "Annual leave"),
]


# =============================================================================
# SEED LOGIC
# =============================================================================

def clear_all(db):
    print("  Clearing leave …");          db.query(LeaveRecord).delete();     db.query(LeaveAllocation).delete()
    print("  Clearing education …");      db.query(EducationRecord).delete()
    print("  Clearing assignments …");    db.query(EmployeePosition).delete()
    print("  Clearing employees …");      db.query(Employee).filter(Employee.role == UserRole.STAFF).delete()
    print("  Clearing positions …");      db.query(Position).delete()
    print("  Clearing departments …");    db.query(Department).delete()
    print("  Clearing functions …");      db.query(OrgFunction).delete()
    db.commit();  print("  ✓ Cleared.\n")


def seed(db):
    now = datetime.utcnow()

    # ── Functions ──────────────────────────────────────────────────────────────
    print("  Seeding functions …")
    fn_map = {}
    for f in FUNCTIONS:
        obj = db.query(OrgFunction).filter(OrgFunction.name == f["name"]).first()
        if not obj:
            obj = OrgFunction(id=uid(), created_at=now, updated_at=now, **f)
            db.add(obj)
        fn_map[f["name"]] = obj
    db.flush()

    # ── Departments — multi-pass until all parents exist ──────────────────────
    print("  Seeding departments …")
    dept_map = {}
    remaining = list(DEPARTMENTS)
    max_passes = 10
    for _ in range(max_passes):
        if not remaining: break
        still_waiting = []
        for (name, desc, fn_name, parent_name) in remaining:
            if parent_name and parent_name not in dept_map:
                still_waiting.append((name, desc, fn_name, parent_name))
                continue
            obj = db.query(Department).filter(Department.name == name).first()
            if not obj:
                obj = Department(
                    id=uid(), name=name, description=desc,
                    function_id=fn_map[fn_name].id if fn_name else None,
                    parent_id=dept_map[parent_name].id if parent_name else None,
                    is_active=True, created_at=now, updated_at=now,
                )
                db.add(obj)
            dept_map[name] = obj
        db.flush()
        remaining = still_waiting
    if remaining:
        print(f"  ⚠ Could not resolve departments: {[r[0] for r in remaining]}")

    # ── Positions — multi-pass until all parents exist ────────────────────────
    print("  Seeding positions …")
    pos_map = {}
    remaining_pos = list(POSITIONS)
    for _ in range(15):
        if not remaining_pos: break
        still_waiting = []
        for (title, level, band, dept_name, parent_title) in remaining_pos:
            if parent_title and parent_title not in pos_map:
                still_waiting.append((title, level, band, dept_name, parent_title))
                continue
            dept = dept_map.get(dept_name)
            if not dept:
                print(f"    ⚠ Dept not found: {dept_name}")
                continue
            obj = db.query(Position).filter(
                Position.title == title, Position.department_id == dept.id
            ).first()
            if not obj:
                obj = Position(
                    id=uid(), title=title, level=level, band=band,
                    description=f"{level} – {dept_name}",
                    department_id=dept.id,
                    parent_position_id=pos_map[parent_title].id if parent_title else None,
                    is_active=True, is_vacant=True,
                    created_at=now, updated_at=now,
                )
                db.add(obj)
            pos_map[title] = obj
        db.flush()
        remaining_pos = still_waiting
    if remaining_pos:
        print(f"  ⚠ Could not resolve positions: {[r[0] for r in remaining_pos]}")

    # ── Employees ──────────────────────────────────────────────────────────────
    print("  Seeding employees …")
    emp_map = {}
    for (full_name, email, phone, dob_str, nat_id, emp_type, past_emp, past_pos) in EMPLOYEES:
        obj = db.query(Employee).filter(Employee.email == email).first()
        if not obj:
            obj = Employee(
                id=uid(), full_name=full_name, email=email, phone=phone,
                date_of_birth=datetime.strptime(dob_str, "%Y-%m-%d"),
                national_id=nat_id, hashed_password=DEFAULT_PASSWORD,
                role=UserRole.STAFF, status=EmployeeStatus.ACTIVE,
                employment_type=emp_type,
                probation_end_date=now + relativedelta(months=3) if emp_type == "permanent" else None,
                contract_end_date=now + relativedelta(years=1)   if emp_type == "temporary" else None,
                past_employer=past_emp, past_position=past_pos,
                created_at=now, updated_at=now,
            )
            db.add(obj)
        emp_map[email] = obj
    db.flush()

    # ── Assignments ────────────────────────────────────────────────────────────
    print("  Seeding assignments & promotions …")
    by_emp = defaultdict(list)
    for row in ASSIGNMENTS: by_emp[row[0]].append(row)

    for email, rows in by_emp.items():
        emp = emp_map.get(email)
        if not emp: print(f"    ⚠ Employee not found: {email}"); continue
        rows_sorted = sorted(rows, key=lambda r: r[2])
        for i, (_, pos_title, start_dt, is_current) in enumerate(rows_sorted):
            pos = pos_map.get(pos_title)
            if not pos: print(f"    ⚠ Position not found: {pos_title}"); continue
            end_dt = (rows_sorted[i+1][2] - timedelta(days=1)) if not is_current and i+1 < len(rows_sorted) else None
            exists = db.query(EmployeePosition).filter(
                EmployeePosition.employee_id == emp.id,
                EmployeePosition.position_id == pos.id,
                EmployeePosition.start_date == start_dt,
            ).first()
            if not exists:
                db.add(EmployeePosition(
                    id=uid(), employee_id=emp.id, position_id=pos.id,
                    start_date=start_dt, end_date=end_dt, is_current=is_current,
                    created_at=now, updated_at=now,
                ))
            if is_current: pos.is_vacant = False
    db.flush()

    # ── Education ──────────────────────────────────────────────────────────────
    print("  Seeding education …")
    for (email, rec_type, title, institution, s_yr, e_yr, grade) in EDUCATION:
        emp = emp_map.get(email)
        if not emp: continue
        if not db.query(EducationRecord).filter(
            EducationRecord.employee_id == emp.id,
            EducationRecord.title == title,
        ).first():
            db.add(EducationRecord(
                id=uid(), employee_id=emp.id, record_type=rec_type, title=title,
                institution=institution, start_date=datetime(s_yr,9,1),
                end_date=datetime(e_yr,6,30), is_current=False, grade=grade,
                created_at=now, updated_at=now,
            ))
    db.flush()

    # ── Leave ──────────────────────────────────────────────────────────────────
    print("  Seeding leave …")

    emp_pos_title = {}
    for email, rows in by_emp.items():
        cur = [r for r in rows if r[3]]
        if cur: emp_pos_title[email] = cur[0][1]

    def annual_days(emp, pos_title):
        if "Graduate Trainee" in pos_title or "Intern" in pos_title: return 0
        if "Managing Director" in pos_title: return 28
        return 18 if emp.employment_type == "temporary" else 21

    alloc_cache = {}

    def get_alloc(emp, lt, yr, override=None):
        key = (emp.id, yr, lt)
        if key in alloc_cache: return alloc_cache[key]
        obj = db.query(LeaveAllocation).filter(
            LeaveAllocation.employee_id == emp.id,
            LeaveAllocation.year == yr,
            LeaveAllocation.leave_type == lt,
        ).first()
        if not obj:
            if lt == "annual":   total = annual_days(emp, emp_pos_title.get(emp.email,""))
            elif lt == "maternity": total = 90
            elif lt == "paternity": total = 14
            else:                total = override or 30
            obj = LeaveAllocation(
                id=uid(), employee_id=emp.id, year=yr, leave_type=lt,
                total_days=total, used_days=0, created_at=now, updated_at=now,
            )
            db.add(obj); db.flush()
        alloc_cache[key] = obj
        return obj

    # Pre-create annual allocations
    for email, emp in emp_map.items():
        for yr in (2025, 2026):
            if "Intern" not in emp_pos_title.get(email,""):
                get_alloc(emp, "annual", yr)

    for (email, lt, start_dt, end_dt, notes) in LEAVES:
        emp = emp_map.get(email)
        if not emp: continue
        days  = working_days(start_dt, end_dt)
        alloc = get_alloc(emp, lt, start_dt.year, override=30 if lt in ("sick","compassionate") else None)
        if lt in ("sick","compassionate") and alloc.total_days < alloc.used_days + days:
            alloc.total_days = alloc.used_days + days
        if lt in ("annual","maternity","paternity"):
            days = min(days, max(0, alloc.total_days - alloc.used_days))
            if days <= 0: continue
        if not db.query(LeaveRecord).filter(
            LeaveRecord.employee_id == emp.id,
            LeaveRecord.start_date == start_dt,
            LeaveRecord.leave_type == lt,
        ).first():
            db.add(LeaveRecord(
                id=uid(), employee_id=emp.id, allocation_id=alloc.id,
                leave_type=lt, start_date=start_dt, end_date=end_dt,
                days_taken=days, status="approved", notes=notes,
                approved_by="Admin", created_at=now, updated_at=now,
            ))
            alloc.used_days += days

    db.commit()
    print("  ✓ Done!\n")


# =============================================================================
# MAIN
# =============================================================================
def main():
    args = sys.argv[1:]
    do_clear = "--clear" in args or "--clear-only" in args
    stop_after_clear = "--clear-only" in args

    db = SessionLocal()
    try:
        if do_clear:
            print("\n[seed] Clearing …")
            clear_all(db)
        if stop_after_clear:
            print("[seed] Clear only — done."); return

        print("[seed] Seeding …\n")
        seed(db)

        print("=" * 55)
        print("  SEED COMPLETE")
        print("=" * 55)
        print(f"  Functions   : {db.query(OrgFunction).count()}")
        print(f"  Departments : {db.query(Department).count()}")
        print(f"  Positions   : {db.query(Position).count()}")
        print(f"  Employees   : {db.query(Employee).filter(Employee.role==UserRole.STAFF).count()}")
        print(f"  Assignments : {db.query(EmployeePosition).count()}")
        print(f"  Education   : {db.query(EducationRecord).count()}")
        print(f"  Leave allocs: {db.query(LeaveAllocation).count()}")
        print(f"  Leave records:{db.query(LeaveRecord).count()}")
        print("=" * 55)
        print("\n  Default password for all staff : NCBAStaff@123")
        print("  Admin account                  : use seed_admin.py\n")

    except Exception as e:
        db.rollback()
        print(f"\n[seed] ERROR: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
