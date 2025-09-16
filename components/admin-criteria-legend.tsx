import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export async function AdminCriteriaAndLegend() {
  const supabase = await createClient();
  
  // fetch voting criteria
  const { data: criteria } = await supabase.from("voting_criteria").select("*").order("id");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-3">📋 Criteri di valutazione</h3>
        <div className="space-y-3 text-sm">
          {criteria?.map((criterion, index) => (
            <div key={criterion.id} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-[#04516f] text-white rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-[#04516f]">{criterion.name}</div>
                <div className="text-muted-foreground text-xs">{criterion.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      <Card className="p-4">
        <h3 className="font-semibold mb-3">🎨 Legenda punteggi</h3>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#04516f] rounded"></div>
            <span>4.0-5.0 (eccellente)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#ffea1d] rounded"></div>
            <span>3.0-3.9 (buono)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>2.0-2.9 (discreto)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>1.0-1.9 (scarso)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}






