export interface ColumnConfig {
  name: string; // The name of the column,
  header: string; // The header of the column,
  field: string; // The field of the column,
  type: string; // The type of the column (text, image, action),
  showTotal?: boolean; // Whether to show the total of the column (for price column),
  total?: number; // The total of the column (for price column),
  action?: string; // The action of the column (for action column),
  actionType?: string; // The type of the action (for action column),
  actionIcon?: string; // The icon of the action (for action column),
  actionColor?: string; // The color of the action (for action column),
}
