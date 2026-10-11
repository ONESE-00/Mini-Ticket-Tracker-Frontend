import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ShellComponent } from './layout/shell/shell.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ShellComponent],
  template: `<app-shell />`,
})
export class App {}
