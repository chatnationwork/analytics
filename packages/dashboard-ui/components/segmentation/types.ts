
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "contains_any" // Array overlaps
  | "contains_all" // Array includes all
  | "starts_with"
  | "ends_with";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface FilterGroup {
  conditions: (FilterCondition | FilterGroup)[];
  logic: "AND" | "OR";
}

/** Top-level filter structure */
export type SegmentFilter = FilterGroup;

export interface FieldDefinition {
  value: string;
  label: string;
  type: "string" | "number" | "date" | "boolean" | "array" | "json";
  operators: FilterOperator[];
}
