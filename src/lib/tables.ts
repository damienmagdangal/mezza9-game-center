type TableLike = {
  table_number: number;
  model_name: string;
};

export function getTableDisplayName(table: TableLike): string {
  return table.model_name;
}

export function getTableDisplayLabel(table: TableLike): string {
  return `${getTableDisplayName(table)} (T${table.table_number})`;
}
