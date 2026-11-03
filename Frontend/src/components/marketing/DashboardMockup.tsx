import {
  BarChart3,
  Bell,
  Check,
  Clock,
  FileText,
  Fuel,
  Package,
  Pause,
  Route,
  Search,
  Truck,
  User,
  Warehouse,
  Wallet,
} from "lucide-react";

const KPIS = [
  { label: "Active orders", value: "1,284", delta: "+12%" },
  { label: "In transit", value: "362", delta: "+8%" },
  { label: "On-time rate", value: "96.4%", delta: "+2.1%" },
  { label: "Fleet utilization", value: "87%", delta: "+3.4%" },
];

const ORDERS = [
  { id: "ORD-24101", customer: "Northwind Freight", route: "Tashkent → Samarkand", status: "In transit" },
  { id: "ORD-24102", customer: "Axis Distribution", route: "Bukhara → Tashkent", status: "Delivered" },
  { id: "ORD-24103", customer: "Meridian Cargo", route: "Almaty → Shymkent", status: "Loading" },
  { id: "ORD-24104", customer: "Bluepeak Retail", route: "Fergana → Namangan", status: "Delayed" },
];

const FLEET = [
  { id: "TRK-01", note: "Tashkent ring", status: "In transit" },
  { id: "TRK-07", note: "Dock 3", status: "Loading" },
  { id: "VAN-12", note: "Depot", status: "Idle" },
  { id: "TRK-03", note: "Samarkand", status: "Delivered" },
];

const ACTIVITY = [
  { icon: Clock, text: "Order ORD-24104 flagged for delay risk", time: "09:42" },
  { icon: User, text: "Driver Akmal S. assigned to ORD-24101", time: "09:37" },
  { icon: FileText, text: "Proof of delivery uploaded for ORD-24102", time: "09:20" },
  { icon: Fuel, text: "Fuel report synced · vehicle UZ 1234 AB", time: "08:58" },
];

const SIDEBAR = [
  { icon: Package, label: "Orders", active: true },
  { icon: Truck, label: "Fleet", active: false },
  { icon: Route, label: "Dispatch", active: false },
  { icon: Warehouse, label: "Warehouse", active: false },
  { icon: Wallet, label: "Finance", active: false },
  { icon: BarChart3, label: "Analytics", active: false },
];

function statusStyle(status: string) {
  switch (status) {
    case "Delivered":
      return { bg: "bg-success", icon: Check };
    case "Loading":
      return { bg: "bg-warning", icon: Package };
    case "Delayed":
      return { bg: "bg-danger", icon: Clock };
    case "Idle":
      return { bg: "bg-blue-100", icon: Pause };
    default:
      return { bg: "bg-blue-100", icon: Truck };
  }
}

function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const { bg, icon: Icon } = statusStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-midnight ${bg} ${
        compact ? "text-[10px]" : "text-[11px]"
      }`}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {status}
    </span>
  );
}

function MapPanel() {
  return (
    <div className="relative h-[210px] overflow-hidden rounded-input border border-line bg-[#ffffff] sm:h-[240px]">
      <svg viewBox="0 0 620 260" fill="none" aria-hidden="true" className="h-full w-full">
        {/* blocks */}
        {[
          [30, 30, 140, 80],
          [210, 30, 170, 80],
          [430, 30, 160, 60],
          [30, 150, 140, 80],
          [210, 150, 110, 80],
          [370, 130, 220, 100],
        ].map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="8" fill="#dbe9f5" />
        ))}
        {/* roads */}
        <path d="M0 130h620M190 0v260M350 0v260" stroke="#DBE9F5" strokeWidth="14" />
        <path d="M0 130h620M190 0v260M350 0v260" stroke="#F4FEFF" strokeWidth="2" strokeDasharray="10 12" />
        {/* active route */}
        <path
          d="M70 210 L190 210 L190 130 L350 130 L350 60 L520 60"
          stroke="#0E2F76"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* depot */}
        <rect x="54" y="194" width="32" height="32" rx="9" fill="#0E2F76" />
        <path
          d="M70 201 80 218a1 1 0 0 1-1.4 1.2L70 216l-8.6 3.2a1 1 0 0 1-1.4-1.2Z"
          fill="#F4FEFF"
        />
        {/* vehicles */}
        <g>
          <circle cx="190" cy="168" r="9" fill="#0E2F76" />
          <circle cx="190" cy="168" r="4" fill="#F4FEFF" />
        </g>
        <g>
          <circle cx="350" cy="105" r="9" fill="#0E2F76" />
          <circle cx="350" cy="105" r="4" fill="#F4FEFF" />
        </g>
        <g>
          <circle cx="470" cy="60" r="9" fill="#C08A88" />
          <circle cx="470" cy="60" r="4" fill="#F4FEFF" />
        </g>
        <circle cx="520" cy="60" r="14" fill="none" stroke="#6B86B6" strokeWidth="1.5" />
        <circle cx="520" cy="60" r="6" fill="#6B86B6" />
      </svg>
      <ul className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-full border border-line bg-white px-3 py-1.5">
        <li className="flex items-center gap-1.5 text-[11px] text-royal">
          <span className="h-2 w-2 rounded-full bg-royal" /> Moving
        </li>
        <li className="flex items-center gap-1.5 text-[11px] text-royal">
          <span className="h-2 w-2 rounded-full bg-danger" /> Delayed
        </li>
        <li className="flex items-center gap-1.5 text-[11px] text-royal">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Depot
        </li>
      </ul>
    </div>
  );
}

/**
 * A realistic enterprise logistics dashboard, built as live markup
 * (not an abstract illustration) so it stays crisp at every breakpoint.
 * All values are illustrative demo data.
 */
export function DashboardMockup() {
  return (
    <div className="rounded-card border border-line bg-white p-2 lg:p-3">
      <div className="flex overflow-hidden rounded-frame border border-line bg-ice">
        {/* Sidebar */}
        <aside className="hidden w-[196px] shrink-0 flex-col bg-royal p-4 text-ice md:flex">
          <div className="flex items-center gap-2 px-2">
            <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6">
              <rect width="32" height="32" rx="9" fill="#F4FEFF" />
              <path
                d="M16 6.6 25.4 25.2a.8.8 0 0 1-1.12.98L16 23.1l-8.28 3.08a.8.8 0 0 1-1.12-.98Z"
                fill="#0E2F76"
              />
            </svg>
            <span className="text-[15px] font-semibold">Logistimus</span>
          </div>
          <nav aria-label="Dashboard demo" className="mt-6 space-y-1">
            {SIDEBAR.map((item) => (
              <span
                key={item.label}
                className={`flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] ${
                  item.active ? "bg-blue-700 text-ice" : "text-powder"
                }`}
              >
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </span>
            ))}
          </nav>
          <div className="mt-auto rounded-input bg-blue-900 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-powder">Workspace</p>
            <p className="type-mono mt-1 text-ice">demo-logistimus</p>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
            <div className="flex h-9 min-w-0 max-w-[300px] flex-1 items-center gap-2 rounded-input border border-line px-3">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate text-[13px] text-muted">Search orders, vehicles, drivers</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="relative hidden sm:inline-flex">
                <Bell aria-hidden="true" className="h-4.5 w-4.5 text-muted" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-royal text-[11px] font-medium text-ice">
                  AD
                </span>
                <span className="hidden text-[13px] text-royal sm:inline">Alisher D.</span>
              </span>
            </div>
          </div>

          {/* Dashboard body */}
          <div className="space-y-3 bg-ice p-3 sm:p-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {KPIS.map((kpi) => (
                <div key={kpi.label} className="rounded-input border border-line bg-white p-3.5">
                  <p className="text-[11px] font-light uppercase tracking-[0.14em] text-muted">
                    {kpi.label}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <span className="text-[26px] font-light leading-none tracking-[-0.02em] text-royal tabular-nums">
                      {kpi.value}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-medium text-midnight">
                      <span aria-hidden="true">↑</span>
                      {kpi.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Map + fleet status */}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-input border border-line bg-white p-3.5 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-royal">Live fleet map</p>
                  <span className="type-mono flex items-center gap-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-royal">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    LIVE
                  </span>
                </div>
                <MapPanel />
              </div>
              <div className="rounded-input border border-line bg-white p-3.5">
                <p className="mb-3 text-sm font-medium text-royal">Fleet status</p>
                <ul className="space-y-2.5">
                  {FLEET.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="type-mono block text-royal">{v.id}</span>
                        <span className="block truncate text-[11px] text-muted">{v.note}</span>
                      </span>
                      <StatusBadge status={v.status} compact />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Orders + activity */}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-input border border-line bg-white p-3.5 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-royal">Active orders</p>
                  <span className="type-mono text-muted">Updated 09:45</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line">
                        {["Order", "Customer", "Route", "Status"].map((h) => (
                          <th
                            key={h}
                            className="pb-2 text-[11px] font-light uppercase tracking-[0.14em] text-muted"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ORDERS.map((o) => (
                        <tr key={o.id} className="border-b border-line last:border-0">
                          <td className="py-2.5">
                            <span className="type-mono text-royal">{o.id}</span>
                          </td>
                          <td className="py-2.5 pr-3 text-[13px] text-royal">{o.customer}</td>
                          <td className="hidden py-2.5 pr-3 text-[13px] text-muted sm:table-cell">
                            {o.route}
                          </td>
                          <td className="py-2.5">
                            <StatusBadge status={o.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-input border border-line bg-white p-3.5">
                <p className="mb-3 text-sm font-medium text-royal">Recent activity</p>
                <ul className="space-y-3">
                  {ACTIVITY.map((a) => (
                    <li key={a.text} className="flex gap-2.5">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-royal">
                        <a.icon aria-hidden="true" className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] leading-snug text-royal">{a.text}</span>
                        <span className="type-mono block text-muted">{a.time}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
