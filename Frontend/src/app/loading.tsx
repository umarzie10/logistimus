export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F4FEFF] p-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-card border border-[#CFDBEE] p-8 space-y-4 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#0E2F76] border-t-transparent animate-spin mx-auto" />
        <h2 className="text-base font-light text-[#061336]">Loading Logistimus Operations</h2>
        <p className="text-xs text-[#3F5C96]">
          Synchronizing corridor maps, active driver manifests, and telematics telemetry...
        </p>
        <div className="pt-2 space-y-2">
          <div className="h-2 w-3/4 bg-[#dbe9f5] rounded-full mx-auto animate-pulse" />
          <div className="h-2 w-1/2 bg-[#dbe9f5] rounded-full mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  );
}
