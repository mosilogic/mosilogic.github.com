import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mosi-logic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent {
  vectorInput: string = '11100111';
  testMap: string[][] = [];
  testSets: string[] = [];
  faultAxes: string[] = [];

  lMatrix: string[][] = [];
  hMatrix: string[][] = [];
  dMatrix: string[][] = [];
  vBits: number[] = [];
  decAxes: number[] = [];

  constructor() { }

  calculateTestMap() {
    this.testMap = [];
    this.testSets = [];
    this.faultAxes = [];
    this.lMatrix = [];
    this.hMatrix = [];
    this.dMatrix = [];
    this.vBits = [];
    this.decAxes = [];

    const vStr = this.vectorInput.trim();
    if (!/^[01]+$/.test(vStr)) {
      alert('Please enter a valid binary string (0s and 1s only).');
      return;
    }

    const v = vStr.split('').map(bit => parseInt(bit, 10));
    const n_len = v.length;

    if ((n_len & (n_len - 1)) !== 0 || n_len === 0) {
      alert('The length of the vector must be a power of 2 (e.g., 2, 4, 8, 16).');
      return;
    }

    const n_vars = Math.log2(n_len);
    this.vBits = v;

    for (let x = 0; x < n_len; x++) {
      this.faultAxes.push(this.toBinaryString(x, n_vars));
      this.decAxes.push(x);
    }

    for (let t = 0; t < n_len; t++) {
      const lRow: string[] = [];
      const hRow: string[] = [];
      const dRow: string[] = [];
      const cRow: string[] = [];

      const t_bin = this.toBinaryString(t, n_vars);
      this.testSets.push(t_bin);

      for (let x = 0; x < n_len; x++) {
        // L-matrix
        const l_val = v[t] ^ v[x];
        lRow.push(l_val === 1 ? '1' : '');

        // H-matrix
        hRow.push((t ^ x).toString());

        // D-matrix
        const d_val = v[t] ^ v[t ^ x];
        dRow.push(d_val === 1 ? '1' : '');

        // C-matrix
        if (d_val === 0) {
          cRow.push('');
        } else {
          const x_bin = this.toBinaryString(x, n_vars);
          let fault_str = '';
          for (let i = 0; i < n_vars; i++) {
            if (x_bin[i] === '1') {
              fault_str += t_bin[i] === '0' ? '1' : '0';
            } else {
              fault_str += '.';
            }
          }
          cRow.push(fault_str);
        }
      }
      this.lMatrix.push(lRow);
      this.hMatrix.push(hRow);
      this.dMatrix.push(dRow);
      this.testMap.push(cRow);
    }
  }

  private toBinaryString(num: number, length: number): string {
    return num.toString(2).padStart(length, '0');
  }
}
