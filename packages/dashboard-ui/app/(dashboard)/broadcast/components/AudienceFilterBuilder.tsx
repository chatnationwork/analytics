import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AudienceFilter, FilterCondition } from "@/lib/broadcast-types";

interface AudienceFilterBuilderProps {
  value?: AudienceFilter;
  onChange: (filter: AudienceFilter) => void;
}

const AVAILABLE_FIELDS = [
  { value: "tags", label: "Tags" },
  { value: "paymentStatus", label: "Payment Status" },
  { value: "lastSeen", label: "Last Seen Date" },
  { value: "name", label: "Name" },
  { value: "phone", label: "Phone Number" },
  { value: "metadata.company", label: "Company (Metadata)" },
  { value: "metadata.role", label: "Role (Metadata)" },
];

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
  { value: "in", label: "In List" },
  { value: "is_not_null", label: "Has Value" },
];

export function AudienceFilterBuilder({ value, onChange }: AudienceFilterBuilderProps) {
  const filter = value || { conditions: [], logic: "AND" };

  const addCondition = () => {
    onChange({
      ...filter,
      conditions: [...filter.conditions, { field: "tags", operator: "contains", value: "" }],
    });
  };

  const removeCondition = (index: number) => {
    const newConditions = [...filter.conditions];
    newConditions.splice(index, 1);
    onChange({ ...filter, conditions: newConditions });
  };

  const updateCondition = (index: number, changes: Partial<FilterCondition>) => {
    const newConditions = [...filter.conditions];
    newConditions[index] = { ...newConditions[index], ...changes };
    onChange({ ...filter, conditions: newConditions });
  };

  const updateLogic = (logic: "AND" | "OR") => {
    onChange({ ...filter, logic });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Audience Rules</Label>
        <div className="flex items-center gap-2">
           <span className="text-sm text-muted-foreground mr-2">Match:</span>
           <div className="flex rounded-md border text-sm overflow-hidden">
              <button 
                type="button"
                className={`px-3 py-1 ${filter.logic === 'AND' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                onClick={() => updateLogic('AND')}
              >
                ALL (AND)
              </button>
              <button 
                type="button"
                className={`px-3 py-1 ${filter.logic === 'OR' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                onClick={() => updateLogic('OR')}
              >
                ANY (OR)
              </button>
           </div>
        </div>
      </div>

      <div className="space-y-3">
        {filter.conditions.map((condition, index) => (
          <Card key={index} className="bg-muted/30">
            <CardContent className="p-3 flex gap-3 items-start">
               <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select 
                    value={condition.field} 
                    onValueChange={(val) => updateCondition(index, { field: val })}
                  >
                    <SelectTrigger><SelectValue placeholder="Field" /></SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={condition.operator} 
                    onValueChange={(val) => updateCondition(index, { operator: val })}
                  >
                    <SelectTrigger><SelectValue placeholder="Operator" /></SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {condition.operator !== 'is_null' && condition.operator !== 'is_not_null' && (
                    <Input 
                      value={String(condition.value || "")}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Value"
                    />
                  )}
               </div>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="text-muted-foreground hover:text-destructive"
                 onClick={() => removeCondition(index)}
               >
                 <Trash2 className="w-4 h-4" />
               </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition} type="button">
        <Plus className="w-4 h-4 mr-2" />
        Add Condition
      </Button>
    </div>
  );
}
