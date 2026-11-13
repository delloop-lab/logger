# Logger Help Guide

**Version:** BETA V.09.790  
**Publisher:** The Novita Group Pty Ltd

> **BETA notice:** Logger is a **BETA** product. Features, screens, and workflows are updated frequently. Expect changes between sessions; report issues via **Contact** in the app footer.

> **Browser app:** Works in your browser. Nothing to download or install. Use it on your phone, tablet, or computer.

---

## What it is for

Logger is a workshop timber inventory and cutting planner. It helps you:

- Catalogue boards, offcuts, and finished pieces with locations and dimensions
- Plan projects and nest cut lists to reduce waste
- Match projects to stock you already have (“What Can I Build?”)
- Print QR stock tags (system print or save as image)
- Scan tags to find lots quickly
- Sync your workshop to the cloud when signed in

---

## Getting started

Welcome to Logger. In a few minutes you can set shop defaults, log raw stock, and generate your first optimized cut list. **Sign in** first so your workshop stays in the cloud (signed out browsing may only show demo data).

### Step 1: Set up your shop defaults

Open **Settings** before logging the first board so kerf and offcut rules stay precise.

- **Primary units:** Metric (mm) or Imperial (inches). Display switches; stock is stored consistently underneath.
- **Default saw kerf:** Your usual table or miter saw blade width (for example 3 mm or 0.125 in). New projects pick this up; you can still override kerf on a single project.
- **Minimum reusable offcut size:** Length and width thresholds (for example 100 × 100 mm). Pieces at or above this return to inventory as offcuts; smaller scraps are treated as waste.
- **Timber species:** Add or rename lumber types in Settings (for example Birch Plywood or Jarrah). These appear in Quick Log and Projects & Cuts when you pick wood species.
- **Suppliers:** Maintain the list used by Quick Log when source is New or Purchased (you can still pick Other… while logging).
- **Storage locations:** Add racks, bins, shed shelves, and benches that match your shop so Quick Log can tag where each lot sits.

### Step 2: Log your first inventory

Take a tape to the rack or offcut bin and log a few boards in **Quick Log** (3 to 5 lots is enough to try nesting).

- **Dimensions:** Length × Width × Thickness in your chosen units, plus quantity for identical boards in one lot.
- **Species / material:** Pick from your lumber types in Settings (defaults include Pine / Pallet, Walnut, European Oak, and more). Logger assigns a lot tag id from the species prefix.
- **Source:** New, pallet, salvaged, cut-off, furniture teardown, offcut bin, or purchased.
- **Description or Supplier (optional):** Beside storage location. Salvaged or Furniture Teardown opens **Description** (e.g. bedhead, stool leg). New or Purchased opens **Supplier** — pick from Settings or **Other…**.
- **Defects & condition:** Flag warp, knots, checks, live edge, waney edges, nail or screw holes, and similar. Optional defect notes travel onto pull tags when that lot is used.
- **Storage location:** Choose the rack or bin so you can find the board later from Inventory or a QR scan.

Quick Log stays open after each save so you can add several lots. Review them under **Inventory**. Print a Stock Tag (**System Print** or **Save PNG**) if you want rack labels you can scan later.

### Step 3: Create a project and parts list

Open **Projects & Cuts** to set up a build and see the yield engine work against your stock.

- **Project name:** Something clear such as Dining Table or Shop Cabinet (required before generating sheets).
- **Parts list:** Add each finished piece with name, species, thickness × width × length, and quantity.
- **Strategy & kerf:** Leave **Let Logger Decide** unless you prefer rip-first or crosscut-first. Kerf defaults from Settings.
- Click **Save project** so it stays in your project library (you can pause and resume if stock is short).

### Step 4: Run the cut list and nesting engine

1. Click **Generate instructions**. If stock does not fit, **stock check** explains each part (required vs on hand) and lets you face-laminate thin solid timber, acknowledge planing thicker solid stock, skip a part, pause to buy stock, or generate what already fits. Sheet goods must match thickness exactly — planing plywood is not suggested. Logger does not substitute a different species.
2. Review the visual cut sheets: rip and crosscut passes aimed at higher yield and less waste. Laminate layers show as reserved stock — glue and plane before cutting, then re-log leftovers in Quick Log when prompted.
3. Confirm cuts one at a time or **mark all remaining** complete. Usable remnants at or above your minimum offcut size return to inventory; true scrap is retired. Finished pieces show as staged until you mark them installed.

### What to try next

- **What Can I Build? (in development)** ranks templates and saved projects against stock on hand.
- **QR Scanner** looks up a board from a printed tag at the rack (camera, photo, or typed tag id).
- Keep location names consistent between Settings and Quick Log so filters stay useful.

---

## What each tab does

### Dashboard
Your workshop home screen. Shows how much timber is available (piece count and face area), how many projects you have, and staged vs installed finished pieces. Lists recent lots, species currently on hand, and how many storage locations are configured. Use the shortcuts to jump into Quick Log, Settings, or Projects & Cuts.

![Dashboard tab](public/help/help-tab-dashboard.png)

### Quick Log
Fast way to add new timber to stock. Choose species from your lumber types, set source, storage location, dimensions, and quantity. Source opens an optional field beside location: **Description** (for Salvaged or Furniture Teardown) or **Supplier** (for New or Purchased — Settings list or **Other…**). Optionally mark defects plus defect notes. Logger assigns a lot tag id automatically. The form stays open after each save so you can log several lots; each appears in Inventory and on the Dashboard.

![Quick Log tab](public/help/help-tab-quick-log.png)

### Inventory
Full catalogue of every lot: raw stock, reusable offcuts, waste remnants, and finished parts. Filter by status (available, staged, consumed), type (stock / offcuts / finished), species, or project. Sort columns, edit dimensions and location, select several lots to delete or print together, mark finished pieces installed, and open **Print label** for QR tags. Deleting stock that a cut plan still uses invalidates that plan so you regenerate from what is left.

![Inventory tab](public/help/help-tab-inventory.png)

### Projects & Cuts
Plan a build end to end. Name or open a project, add parts (name, species from your lumber types, size, quantity), set kerf and cutting strategy, then generate nested cutting sheets. A **stock check** flags mismatches before sheets open (missing species, too thin / too thick, sheet-goods thickness). Solid timber can use face-laminate or planing acknowledgments; plywood is never suggested for planing. Confirm cuts one at a time or mark all remaining. Save or pause when stock is short, then resume later.

![Projects & Cuts tab](public/help/help-tab-projects-cuts.png)

### What Can I Build? (in development)
Idea finder for the timber you already have. Compares project templates and your saved projects to available boards by species and size so you can pick a realistic next build, then open it in Projects & Cuts to generate a cut list. This area is still in development.

![What Can I Build tab](public/help/help-tab-what-can-i-build.png)

### QR Scanner
Find a board at the rack without typing. Start the camera (or upload a photo of a tag), scan the printed QR, and Logger looks up the lot. You can also type or paste a tag id. A match shows species, dimensions, location, defects, and status so you pull the right piece.

![QR Scanner tab](public/help/help-tab-qr-scanner.png)

### Settings
Workshop preferences: metric (mm) or imperial (inches), default saw kerf for new projects, minimum reusable offcut size, lumber types (add or rename), **suppliers** (Quick Log dropdown), storage locations, workshop backups, and tools to reset workshop data if you need a clean start.

![Settings tab](public/help/help-tab-settings.png)

---

## QR labels & printing

![Example Logger Stock Tag stapled to a board end](public/help/workshop-stock-tag.jpg)

*Example: a printed Stock Tag on a board end. Scan the QR in Inventory / QR Scanner to look up the lot.*

From a board in **Inventory**, open the label dialog:

- **System Print**: browser print dialog for a large readable label on A4/Letter.
- **Save PNG**: download the label as an image file.

Printed tags encode the board tag id so the **QR Scanner** can find the lot again.

---

## Cloud sync & accounts

- Signed-in sessions sync workshop data through Supabase-backed cloud sync.
- Signed-out browsing may show a **demo preview** only. Log in for your real stock.
- Sign out from the header when finished on a shared machine.

---

## Tips

- Keep locations, lumber types, and suppliers consistent (Settings ↔ Quick Log) so filters stay useful.
- Use Description on salvaged / teardown stock and Supplier on new / purchased stock so you remember what each lot is.
- After laminating and cutting, re-log any leftover blank in Quick Log — old layer tags are consumed.
- Log reusable offcuts after a cut so the matcher and cut planner can reuse them.
- Print QR labels from Inventory so the QR Scanner can find lots at the rack.

---

## FAQ

**Is this finished software?**  
No. It is **BETA** and changes often as features are refined.

**Do I need an account?**  
Yes, to keep and sync your own workshop. Without login you may only see demo/sample data.

**Metric or imperial?**  
Either. Switch in **Settings**; dimensions convert for display while stock is stored consistently underneath.

**Can I add my own lumber types?**  
Yes. In **Settings**, add or rename types such as Birch Plywood or Jarrah. They appear in Quick Log and Projects & Cuts.

**What are Description and Supplier on Quick Log?**  
Optional fields beside Storage Location. **Salvaged** or **Furniture Teardown** shows **Description**. **New** or **Purchased** shows **Supplier** (Settings list or **Other…**). Quick Log stays open after each save.

**What happens if stock is the wrong thickness for a part?**  
Stock check shows the part, the gap, and actions. Too thin (solid): laminate or skip. Too thick (solid): acknowledge planing or skip. Sheet goods must match thickness exactly. You can also pause or generate what already fits.

**If I laminate, what happens to those boards?**  
Layers are reserved on the plan, then consumed when you confirm the finished cut. Re-log any leftover laminated stock in Quick Log with measured dimensions.

**Will Logger use a different species if mine is missing?**  
No. Log the right timber, skip that part, or pause the project.

**What does “consumed” mean?**  
The lot is no longer available as pullable stock (used up or installed finished work, depending on classification).

**Where do I get help or report a problem?**  
Use **Contact** in the footer (`loggerhelp@novitagroup.com`), or open **Help** / **Getting started** in the footer for the in-app guides.

---

## Contact

Email: [loggerhelp@novitagroup.com](mailto:loggerhelp@novitagroup.com)

Copyright (c) 2026 The Novita Group Pty Ltd
