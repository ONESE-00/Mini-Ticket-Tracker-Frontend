import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * Marks a projected <ng-template> as the renderer for a custom column.
 * Usage in the parent:
 *   <app-data-table ...>
 *     <ng-template dataTableCell="title" let-row>...</ng-template>
 *   </app-data-table>
 * The `name` must match a ColumnDef.cellTemplate.
 */
@Directive({
  selector: 'ng-template[dataTableCell]',
})
export class DataTableCellDirective {
  /** The custom column name this template renders. */
  readonly name = input.required<string>({ alias: 'dataTableCell' });
  readonly templateRef = inject(TemplateRef<{ $implicit: unknown; row: unknown }>);
}
