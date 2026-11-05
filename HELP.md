# Logger Help Guide

**Version:** BETA 1.06.000  
**Publisher:** Lou Schillaci

> **BETA notice:** Logger (formally TimberVault) is a **BETA** product. Features, screens, and workflows are updated frequently. Expect changes between sessions; report issues via **Contact** in the app footer.

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
- **Storage locations:** Add racks, bins, shed shelves, and benches that match your shop so Quick Log can tag where each lot sits.

### Step 2: Log your first inventory

Take a tape to the rack or offcut bin and log a few boards in **Quick Log** (3 to 5 lots is enough to try nesting).

- **Dimensions:** Length × Width × Thickness in your chosen units, plus quantity for identical boards in one lot.
- **Species / material:** Pick from the list (Pine / Pallet, Walnut, European Oak, Maple, Plywood, and more). Logger assigns a lot tag id from the species prefix.
- **Source:** New, pallet, salvaged, cut-off, furniture teardown, offcut bin, or purchased.
- **Defects & condition:** Flag warp, knots, checks, live edge, waney edges, nail or screw holes, and similar. Optional notes travel onto pull tags when that lot is used.
- **Storage location:** Choose the rack or bin so you can find the board later from Inventory or a QR scan.

After saving, review lots under **Inventory**. Print a Stock Tag (**System Print** or **Save PNG**) if you want rack labels you can scan later.

### Step 3: Create a project and parts list

Open **Projects & Cuts** to set up a build and see the yield engine work against your stock.

- **Project name:** Something clear such as Dining Table or Shop Cabinet (required before generating sheets).
- **Parts list:** Add each finished piece with name, species, thickness × width × length, and quantity.
- **Strategy & kerf:** Leave **Let Logger Decide** unless you prefer rip-first or crosscut-first. Kerf defaults from Settings.
- Click **Save project** so it stays in your project library (you can pause and resume if stock is short).

### Step 4: Run the cut list and nesting engine

1. Click **Generate instructions** (shown with how many boards the plan needs).
2. Review the visual cut sheets: rip and crosscut passes aimed at higher yield and less waste. Confirm each cut as you work the board.
3. When cuts are applied, usable remnants at or above your minimum offcut size return to inventory; true scrap is retired. Finished pieces show as staged until you mark them installed.

### What to try next

- **What Can I Build?** ranks templates and saved projects against stock on hand (READY / ALMOST / NEED STOCK).
- **QR Scanner** looks up a board from a printed tag at the rack (camera, photo, or typed tag id).
- Keep location names consistent between Settings and Quick Log so filters stay useful.

---

## What each tab does

### Dashboard
Your workshop home screen. Shows how much timber is available (piece count and face area), how many projects you have, and staged vs installed finished pieces. Lists recent lots, species currently on hand, and how many storage locations are configured. Use the shortcuts to jump into Quick Log, Settings, or Projects & Cuts.

![Dashboard tab](public/help/help-tab-dashboard.png)

### Quick Log
Fast way to add new timber to stock. Enter species, source, length / width / thickness, quantity, and storage location. Optionally mark defects (warp, knot, split, and so on) plus notes. Logger assigns a lot tag id automatically (based on species). After you save, the lot appears in Inventory and on the Dashboard.

![Quick Log tab](public/help/help-tab-quick-log.png)

### Inventory
Full catalogue of every lot: raw stock, reusable offcuts, waste remnants, and finished parts. Filter by status (available, staged, consumed), type (stock / offcuts / finished), species, or project. Sort columns, edit dimensions and location, delete lots, mark finished pieces installed, and open **Print label** for QR tags (system print or save as image).

![Inventory tab](public/help/help-tab-inventory.png)

### Projects & Cuts
Plan a build end to end. Name or open a project, add parts (name, species, size, quantity), set kerf and cutting strategy, then generate nested cutting sheets against available boards. Review shop drawings, save or pause projects when stock is short, resume later, and apply cuts so remnants / finished parts update Inventory.

![Projects & Cuts tab](public/help/help-tab-projects-cuts.png)

### What Can I Build?
Idea finder for the timber you already have. Compares project templates and your saved projects to available boards by species and size. Shows READY / ALMOST / NEED STOCK so you can pick a realistic next build, then open it in Projects & Cuts to generate a cut list.

![What Can I Build tab](public/help/help-tab-what-can-i-build.png)

### QR Scanner
Find a board at the rack without typing. Start the camera (or upload a photo of a tag), scan the printed QR, and Logger looks up the lot. You can also type or paste a tag id. A match shows species, dimensions, location, defects, and status so you pull the right piece.

![QR Scanner tab](public/help/help-tab-qr-scanner.png)

### Settings
Workshop preferences: metric (mm) or imperial (inches), default saw kerf for new projects, minimum size that counts as a reusable offcut, and your list of storage locations (rack, workbench, shed, and so on). Also shows who is signed in and tools to reset workshop data if you need a clean start.

![Settings tab](public/help/help-tab-settings.png)

*(Account email is blurred in the Settings screenshot.)*

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

- Keep locations consistent (same names in Quick Log and Settings) so filters stay useful.
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

**What does “consumed” mean?**  
The lot is no longer available as pullable stock (used up or installed finished work, depending on classification).

**Where do I get help or report a problem?**  
Use **Contact** in the footer (`silvervirtual@gmail.com`), or open **Help** in the footer for this guide inside the app.

---

## Contact

Lou Schillaci  
Email: [silvervirtual@gmail.com](mailto:silvervirtual@gmail.com)

Copyright (c) 2026 Lou Schillaci
