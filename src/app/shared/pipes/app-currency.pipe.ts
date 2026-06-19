import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { currencyDisplaySymbol } from '../../core/constants/currencies';

@Pipe({
  name: 'appCurrency',
  standalone: true,
})
export class AppCurrencyPipe implements PipeTransform {
  private readonly currencyPipe = new CurrencyPipe('en-US');

  transform(
    value: number | null | undefined,
    currencyCode?: string | null,
    digitsInfo = '1.0-0',
  ): string | null {
    if (value == null) return null;

    const formatted = this.currencyPipe.transform(value, 'USD', '', digitsInfo);
    if (formatted == null) return null;

    const symbol = currencyDisplaySymbol(currencyCode);
    return symbol.length > 1 ? `${symbol} ${formatted}` : `${symbol}${formatted}`;
  }
}
