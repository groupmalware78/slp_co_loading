# Test Credentials

Generated test data for local development. All `@example.test` addresses are fake
(IANA-reserved domain, never delivers real mail) — safe to use everywhere.

---

## Service-Provider (admin) app — http://localhost:3000

Administrators see every section (Companies/Users/Audit Log/Reports/
Manifests/Rates/Banking/Packages). Scanner/Logger/CSR accounts sign into
this same app/URL (the standalone Warehouse app was merged into admin)
and only see Packages: Scanner can log new packages via barcode scan
only; Logger can locate (scan) and edit already-logged packages only;
CSR is read-only.

| Name | Email | Password | Role |
|---|---|---|---|
| Yse Admin | admin@yseja.com | Password#123 | Administrator |
| Devon Palmer | devon.palmer@yseja.com | WarehousePass#123 | Logger |
| Latoya Bennett | latoya.bennett@yseja.com | WarehousePass#123 | Logger |
| Ricardo Foster | ricardo.foster@yseja.com | WarehousePass#123 | Logger |
| Kemar Grant | kemar.grant@yseja.com | WarehousePass#123 | Scanner |

---

## Customer portals

All customer-portal accounts below (Admin, CSR, Driver, Customer — every role)
share one password: **`TestPass#123`**

### Swift Cargo Express (SCE) — http://localhost:3001
Directory: `customer-portal`

**Admin**
| Name | Email |
|---|---|
| Alicia Brown | alicia@swiftcargo.example.test |

**CSR**
| Name | Email |
|---|---|
| Simone Blake | csr1@sce.example.test |
| Tanya Brown | csr2@sce.example.test |

**Driver**
| Name | Email |
|---|---|
| Simone Campbell | driver1@sce.example.test |
| Nicole Blake | driver2@sce.example.test |

**Customers**
| Name | Email | Customer ID |
|---|---|---|
| Leon Williams | customer1@sce.example.test | SCE-00001 |
| Kevin Brown | customer2@sce.example.test | SCE-00002 |
| Sasha Thompson | customer3@sce.example.test | SCE-00003 |
| Tanya Powell | customer4@sce.example.test | SCE-00004 |
| James Mitchell | customer5@sce.example.test | SCE-00005 |
| Kevin Mitchell | customer6@sce.example.test | SCE-00006 |
| Kerry-Ann Reid | customer7@sce.example.test | SCE-00007 |
| Andre Blake | customer8@sce.example.test | SCE-00008 |
| Tanya Blake | customer9@sce.example.test | SCE-00009 |
| David Powell | customer10@sce.example.test | SCE-00010 |

---

### Blue Horizon Freight (BHF) — http://localhost:3002
Directory: `customer-portal-bhf`

**Admin**
| Name | Email |
|---|---|
| Marcus Reid | marcus@bluehorizon.example.test |

**CSR**
| Name | Email |
|---|---|
| David Reid | csr1@bhf.example.test |
| Andre Williams | csr2@bhf.example.test |

**Driver**
| Name | Email |
|---|---|
| Leon Hutchinson | driver1@bhf.example.test |
| Simone Grant | driver2@bhf.example.test |

**Customers**
| Name | Email | Customer ID |
|---|---|---|
| Andre Powell | customer1@bhf.example.test | BHF-00001 |
| Marcus Grant | customer2@bhf.example.test | BHF-00002 |
| Nicole Hutchinson | customer3@bhf.example.test | BHF-00003 |
| James Brown | customer4@bhf.example.test | BHF-00004 |
| Nicole Williams | customer5@bhf.example.test | BHF-00005 |
| Nicole Blake | customer6@bhf.example.test | BHF-00006 |
| Simone Grant | customer7@bhf.example.test | BHF-00007 |
| Leon Thompson | customer8@bhf.example.test | BHF-00008 |
| Maria Hutchinson | customer9@bhf.example.test | BHF-00009 |
| Leon Blake | customer10@bhf.example.test | BHF-00010 |

---

### Island Direct Shipping (IDS) — http://localhost:3003
Directory: `customer-portal-ids`

**Admin**
| Name | Email |
|---|---|
| Kayla Thompson | kayla@islanddirect.example.test |

**CSR**
| Name | Email |
|---|---|
| Kevin Thompson | csr1@ids.example.test |
| Leon Brown | csr2@ids.example.test |

**Driver**
| Name | Email |
|---|---|
| Andre Powell | driver1@ids.example.test |
| Kevin Powell | driver2@ids.example.test |

**Customers**
| Name | Email | Customer ID |
|---|---|---|
| Nicole Powell | customer1@ids.example.test | IDS-00001 |
| Marcus Blake | customer2@ids.example.test | IDS-00002 |
| Sasha Powell | customer3@ids.example.test | IDS-00003 |
| Simone Campbell | customer4@ids.example.test | IDS-00004 |
| Kevin Thompson | customer5@ids.example.test | IDS-00005 |
| Nicole Hutchinson | customer6@ids.example.test | IDS-00006 |
| Kevin Blake | customer7@ids.example.test | IDS-00007 |
| Simone Hutchinson | customer8@ids.example.test | IDS-00008 |
| James Williams | customer9@ids.example.test | IDS-00009 |
| David Campbell | customer10@ids.example.test | IDS-00010 |