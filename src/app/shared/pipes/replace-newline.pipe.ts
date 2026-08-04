import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceNewline',
  standalone: true
})
export class ReplaceNewlinePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    // 1. Échapper les caractères HTML dangereux AVANT toute transformation
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // 2. Puis remplacer les retours à la ligne par des <br>
    return escaped.replace(/\n/g, '<br>');
  }
}
