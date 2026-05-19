# omcport TUI smoke — 2026-05-19

**Environment:** macOS 25.5.0, Node 20, `OMCPORT_DIR=/tmp/omcport-smoke`

## Screenshots

- `omcport-tui-list.png` — list view, 28 projects, cursor on benchmob
- `omcport-tui-slotmap.png` — slot-map drill-in for collab-editor (base 13128)
- `omcport-tui-add.png` — add flow, typing ~/imga-dev/tennis-ops-prototypes
- `omcport-tui-after-add.png` — list view after add; tennis-ops-prototypes at base 13864

## Observations

List view renders correctly: 28 projects sorted by base port (13000–13864), cursor arrow
visible, all 8 keybindings shown in hint bar. Pool header shows 13000–17999.

Slot-map drill-in ([s] on collab-editor): shows full 8-port window with correct named slots
(web=13128, api=13129, storybook=13130, preview=13131, db=13132, worker=13133,
docs=13134, admin=13135). LIVE column empty (no running server). [Esc/b] back works.

Add flow ([a]): TextInput renders inline. Typed full absolute path
`/Users/jgrossman/imga-dev/tennis-ops-prototypes`, pressed Enter. Project appeared in
list at base 13864 (next free stride). Registry mutation confirmed via re-render.

↑↓ navigation moves cursor cleanly. [q] exits without error.

## Result

PASS — all TUI features functional.
