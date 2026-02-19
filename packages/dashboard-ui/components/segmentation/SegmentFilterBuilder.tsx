import { useState, useCallback } from "react";
import { Plus, Trash2, Copy, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SegmentFilter, FilterGroup, FilterCondition, FieldDefinition, FilterOperator } from "./types";

interface SegmentFilterBuilderProps {
  value?: SegmentFilter;
  onChange: (filter: SegmentFilter) => void;
  fields: FieldDefinition[];
  depth?: number;
}

const DEFAULT_OPERATORS: Record<string, FilterOperator[]> = {
  string: ["eq", "neq", "contains", "starts_with", "ends_with", "in", "is_null", "is_not_null"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "in", "is_null", "is_not_null"],
  date: ["eq", "neq", "gt", "gte", "lt", "lte", "is_null", "is_not_null"],
  boolean: ["eq", "neq", "is_null", "is_not_null"],
  array: ["contains", "contains_any", "contains_all"], // contains here matches "is part of" or "has element" depending on context, usually contains check
  json: ["eq", "neq", "contains", "is_null", "is_not_null"],
};

export function SegmentFilterBuilder({ value, onChange, fields, depth = 0 }: SegmentFilterBuilderProps) {
  // Ensure we always have a valid group
  const filter: FilterGroup = value || { conditions: [], logic: "AND" };

  const updateLogic = (logic: "AND" | "OR") => {
    onChange({ ...filter, logic });
  };

  const addCondition = () => {
    const defaultField = fields[0];
    const newCondition: FilterCondition = {
      field: defaultField.value,
      operator: defaultField.operators[0] || "eq",
      value: "",
    };
    onChange({
      ...filter,
      conditions: [...filter.conditions, newCondition],
    });
  };

  const addGroup = () => {
    const newGroup: FilterGroup = {
      conditions: [],
      logic: filter.logic === "AND" ? "OR" : "AND", // Alternate logic for nested groups by default
    };
    onChange({
      ...filter,
      conditions: [...filter.conditions, newGroup],
    });
  };

  const removeItem = (index: number) => {
    const newConditions = [...filter.conditions];
    newConditions.splice(index, 1);
    onChange({ ...filter, conditions: newConditions });
  };

  const updateItem = (index: number, newItem: FilterCondition | FilterGroup) => {
    const newConditions = [...filter.conditions];
    newConditions[index] = newItem;
    onChange({ ...filter, conditions: newConditions });
  };

  const getOperators = (fieldName: string) => {
    const field = fields.find(f => f.value === fieldName);
    if (field?.operators?.length) return field.operators;
    return DEFAULT_OPERATORS[field?.type || "string"] || DEFAULT_OPERATORS.string;
  };

  return (
    <div className={cn("space-y-3", depth > 0 && "pl-4 border-l-2 border-muted")}>
      {/* Group Header (Logic Switcher) */}
      <div className="flex items-center gap-2 mb-2">
        {depth > 0 && <CornerDownRight className="w-4 h-4 text-muted-foreground" />}
        <div className="flex rounded-md border bg-background text-xs overflow-hidden">
          <button
            type="button"
            className={cn(
              "px-3 py-1 transition-colors",
              filter.logic === "AND"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            onClick={() => updateLogic("AND")}
          >
            AND (All)
          </button>
          <div className="w-[1px] bg-border" />
          <button
            type="button"
            className={cn(
              "px-3 py-1 transition-colors",
              filter.logic === "OR"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            onClick={() => updateLogic("OR")}
          >
            OR (Any)
          </button>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex gap-2">
           <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={addCondition} type="button">
             <Plus className="w-3 h-3 mr-1" />
             Rule
           </Button>
           <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={addGroup} type="button">
             <Copy className="w-3 h-3 mr-1" />
             Group
           </Button>
        </div>
      </div>

      {/* Conditions List */}
      <div className="space-y-3">
        {filter.conditions.length === 0 && (
          <div className="text-sm text-muted-foreground italic px-2 py-1">
            No rules applied.
          </div>
        )}
        
        {filter.conditions.map((item, index) => (
          <div key={index} className="relative group">
            {/* If it's a nested group */}
            {"logic" in item ? (
              <div className="flex items-start gap-2">
                 <div className="flex-1">
                   <SegmentFilterBuilder 
                     value={item as FilterGroup}
                     onChange={(val) => updateItem(index, val)}
                     fields={fields}
                     depth={depth + 1}
                   />
                 </div>
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
              </div>
            ) : (
              /* If it's a regular condition */
              <Card className="bg-muted/30 border-dashed border-input shadow-none">
                <CardContent className="p-2 flex gap-2 items-center">
                   <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Select
                        value={(item as FilterCondition).field}
                        onValueChange={(val) => {
                           const field = fields.find(f => f.value === val);
                           const ops = getOperators(val);
                           updateItem(index, { 
                             ...(item as FilterCondition), 
                             field: val,
                             operator: ops[0], // Reset operator on field change
                             value: "" // Reset value
                           });
                        }}
                      >
                        <SelectTrigger className="h-8"><SelectValue placeholder="Field" /></SelectTrigger>
                        <SelectContent>
                          {fields.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select
                        value={(item as FilterCondition).operator}
                        onValueChange={(val) => updateItem(index, { ...(item as FilterCondition), operator: val as FilterOperator })}
                      >
                        <SelectTrigger className="h-8"><SelectValue placeholder="Operator" /></SelectTrigger>
                        <SelectContent>
                          {getOperators((item as FilterCondition).field).map(op => (
                            <SelectItem key={op} value={op}>{op.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {!["is_null", "is_not_null"].includes((item as FilterCondition).operator) && (
                        <Input
                          className="h-8"
                          value={String((item as FilterCondition).value || "")}
                          onChange={(e) => updateItem(index, { ...(item as FilterCondition), value: e.target.value })}
                          placeholder="Value"
                        />
                      )}
                   </div>
                   <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Logic connector line (visual only) */}
            {index < filter.conditions.length - 1 && (
               <div className="absolute left-[18px] -bottom-3 w-[2px] h-3 bg-border -z-10" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
