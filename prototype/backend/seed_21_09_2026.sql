
-- ============================================================
-- TABLE: scraped_on_21_09_2026
-- ============================================================
CREATE TABLE IF NOT EXISTS public."scraped_on_21_09_2026" (
    "ID"            TEXT          PRIMARY KEY,
    route           TEXT          NOT NULL,
    carrier         TEXT          NOT NULL,
    flight_number   TEXT          NOT NULL,
    is_non_stop     BOOLEAN       NOT NULL DEFAULT TRUE,
    t_window        TEXT          NOT NULL,
    base_fare       NUMERIC(10,2),
    taxes           NUMERIC(10,2),
    udf_fee         NUMERIC(10,2),
    gross_fare      NUMERIC(10,2),
    status          TEXT          NOT NULL DEFAULT 'Available',
    source          TEXT          NOT NULL DEFAULT 'SkyRate Network',
    scraped_at      TIMESTAMPTZ   DEFAULT NOW()
);
INSERT INTO public."scraped_on_21_09_2026"
    ("ID", route, carrier, flight_number, is_non_stop, t_window, base_fare, taxes, udf_fee, gross_fare, status, source, scraped_at)
VALUES

('f21092026_001','DEL-BOM','IndiGo','6E-204',TRUE,'T',9200.0,1223.0,77.0,10500.0,'Available','SkyRate Network',NOW())    ,('f21092026_002','DEL-BOM','IndiGo','6E-315',TRUE,'T+1',6500.0,923.0,77.0,7500.0,'Available','SkyRate Network',NOW())    ,('f21092026_003','DEL-BOM','IndiGo','6E-401',TRUE,'T+7',5800.0,823.0,77.0,6700.0,'Available','SkyRate Network',NOW())    ,('f21092026_004','DEL-BOM','IndiGo','6E-510',TRUE,'T+15',4500.0,680.0,77.0,5257.0,'Available','SkyRate Network',NOW())    ,('f21092026_005','DEL-BOM','IndiGo','6E-612',TRUE,'T+30',3800.0,620.0,77.0,4497.0,'Available','SkyRate Network',NOW())    ,('f21092026_006','DEL-BOM','IndiGo','6E-720',TRUE,'T+45',3500.0,580.0,77.0,4157.0,'Available','SkyRate Network',NOW())    ,('f21092026_007','DEL-BOM','Air India','AI-805',TRUE,'T',9800.0,1350.0,77.0,11227.0,'Available','SkyRate Network',NOW())    ,('f21092026_008','DEL-BOM','Air India','AI-811',TRUE,'T+1',7200.0,1023.0,77.0,8300.0,'Available','SkyRate Network',NOW())    ,('f21092026_009','DEL-BOM','Air India','AI-102',TRUE,'T+1',NULL,NULL,77.0,NULL,'Sold Out / Cancelled','SkyRate Network',NOW())    ,('f21092026_010','DEL-BOM','Air India','AI-812',TRUE,'T+30',4000.0,620.0,77.0,4697.0,'Available','SkyRate Network',NOW())    ,('f21092026_011','DEL-BOM','SpiceJet','SG-8169',TRUE,'T+7',4800.0,723.0,77.0,5600.0,'Available','SkyRate Network',NOW())    ,('f21092026_012','DEL-BOM','SpiceJet','SG-123',FALSE,'T+1',5100.0,723.0,77.0,5900.0,'Available','SkyRate Network',NOW())    ,('f21092026_013','DEL-BOM','SpiceJet','SG-205',TRUE,'T+45',3600.0,580.0,77.0,4257.0,'Available','SkyRate Network',NOW())    ,('f21092026_014','BLR-DEL','IndiGo','6E-512',TRUE,'T+1',8200.0,1150.0,250.0,9600.0,'Available','SkyRate Network',NOW())    ,('f21092026_015','BLR-DEL','IndiGo','6E-601',TRUE,'T+7',7500.0,1050.0,250.0,8800.0,'Available','SkyRate Network',NOW())    ,('f21092026_016','BLR-DEL','Air India','AI-502',TRUE,'T+1',8800.0,1200.0,250.0,10250.0,'Available','SkyRate Network',NOW())    ,('f21092026_017','BLR-DEL','Air India','AI-601',TRUE,'T+15',6500.0,950.0,250.0,7700.0,'Available','SkyRate Network',NOW())    ,('f21092026_018','BOM-GOI','Akasa Air','QP-1302',TRUE,'T+15',3200.0,420.0,120.0,3740.0,'Available','SkyRate Network',NOW())    ,('f21092026_019','BOM-GOI','IndiGo','6E-7801',TRUE,'T',4500.0,680.0,120.0,5300.0,'Available','SkyRate Network',NOW())    ,('f21092026_020','BOM-GOI','SpiceJet','SG-901',TRUE,'T+7',3600.0,540.0,120.0,4260.0,'Available','SkyRate Network',NOW())    ,('f21092026_021','DEL-CCU','Air India','AI-701',TRUE,'T+30',4100.0,623.0,77.0,4800.0,'Available','SkyRate Network',NOW())    ,('f21092026_022','DEL-CCU','IndiGo','6E-801',TRUE,'T+7',5200.0,750.0,77.0,6027.0,'Available','SkyRate Network',NOW())    ,('f21092026_023','DEL-CCU','SpiceJet','SG-401',TRUE,'T+15',4600.0,680.0,77.0,5357.0,'Available','SkyRate Network',NOW())    ,('f21092026_024','BOM-BLR','IndiGo','6E-901',TRUE,'T+1',6800.0,980.0,250.0,8030.0,'Available','SkyRate Network',NOW())    ,('f21092026_025','BOM-BLR','Air India','AI-302',TRUE,'T',8200.0,1150.0,250.0,9600.0,'Available','SkyRate Network',NOW())
ON CONFLICT ("ID") DO NOTHING;

-- ============================================================
-- TABLE: index_for_21_09_2026
-- ============================================================
CREATE TABLE IF NOT EXISTS public."index_for_21_09_2026" (
    "State"             TEXT          NOT NULL,
    "Time_Horizon"      TEXT          NOT NULL,
    "MoSPI_Base"        NUMERIC(8,2),
    "Basket_Inflation"  TEXT,
    "RealTime_APIx"     NUMERIC(8,2),
    computed_at         TIMESTAMPTZ   DEFAULT NOW(),
    PRIMARY KEY ("State", "Time_Horizon")
);
INSERT INTO public."index_for_21_09_2026"
    ("State", "Time_Horizon", "MoSPI_Base", "Basket_Inflation", "RealTime_APIx", computed_at)
VALUES

('All India','T',134.2,'14.2%',153.26,NOW())    ,('All India','T+1',134.2,'11.5%',149.63,NOW())    ,('All India','T+7',134.2,'6.8%',143.33,NOW())    ,('All India','T+15',134.2,'3.1%',138.36,NOW())    ,('All India','T+30',134.2,'-0.8%',133.13,NOW())    ,('All India','T+45',134.2,'-2.5%',130.85,NOW())    ,('Delhi','T',138.5,'16.4%',161.21,NOW())    ,('Delhi','T+1',138.5,'13.2%',156.76,NOW())    ,('Delhi','T+7',138.5,'8.0%',149.58,NOW())    ,('Delhi','T+15',138.5,'4.5%',144.73,NOW())    ,('Delhi','T+30',138.5,'0.2%',138.78,NOW())    ,('Maharashtra','T',132.8,'13.2%',150.33,NOW())    ,('Maharashtra','T+1',132.8,'10.5%',146.74,NOW())    ,('Maharashtra','T+7',132.8,'6.1%',140.89,NOW())    ,('Maharashtra','T+15',132.8,'2.8%',136.52,NOW())    ,('Maharashtra','T+30',132.8,'-1.2%',131.21,NOW())    ,('Karnataka','T',136.1,'12.0%',152.43,NOW())    ,('Karnataka','T+1',136.1,'9.5%',149.02,NOW())    ,('Karnataka','T+7',136.1,'5.5%',143.59,NOW())    ,('Karnataka','T+15',136.1,'2.1%',139.02,NOW())    ,('West Bengal','T',130.5,'11.5%',145.51,NOW())    ,('West Bengal','T+7',130.5,'5.8%',138.07,NOW())    ,('Tamil Nadu','T',131.2,'10.8%',145.37,NOW())    ,('Tamil Nadu','T+7',131.2,'5.2%',138.02,NOW())    ,('Telangana','T',133.5,'12.5%',150.19,NOW())    ,('Telangana','T+7',133.5,'6.3%',141.91,NOW())    ,('Gujarat','T',129.8,'11.0%',144.08,NOW())    ,('Gujarat','T+7',129.8,'5.0%',136.29,NOW())
ON CONFLICT ("State", "Time_Horizon") DO UPDATE SET
    "MoSPI_Base" = EXCLUDED."MoSPI_Base",
    "Basket_Inflation" = EXCLUDED."Basket_Inflation",
    "RealTime_APIx" = EXCLUDED."RealTime_APIx",
    computed_at = NOW();