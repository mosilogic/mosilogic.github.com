import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
    selector: 'app-second',
    standalone: true,
    imports: [FormsModule, CommonModule, ReactiveFormsModule],
    templateUrl: './second.component.html',
    styleUrls: ['./second.component.scss'],
})
export class SecondComponent implements OnInit {
    resultMatrix: any[][] = [];
    resultString: string = '';
    colHeaders: string[] = [];
    rowHeaders: string[] = [];
    combinationSignature = [0, 0, 0, 1]
    form: any;
    rowsVector: number[] = [];
    colsVector: number[] = [];
    combinationOperators = [
        { name: 'FALSE', value: '0000' },
        { name: 'AND', value: '0001' },
        { name: 'A AND NOT B', value: '0010' },
        { name: 'A', value: '0011' },
        { name: 'NOT A AND B', value: '0100' },
        { name: 'B', value: '0101' },
        { name: 'XOR', value: '0110' },
        { name: 'OR', value: '0111' },
        { name: 'NOR', value: '1000' },
        { name: 'XNOR', value: '1001' },
        { name: 'NOT B', value: '1010' },
        { name: 'A OR NOT B', value: '1011' },
        { name: 'NOT A', value: '1100' },
        { name: 'NOT A OR B', value: '1101' },
        { name: 'NAND', value: '1110' },
        { name: 'TRUE', value: '1111' }
    ];

    constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        this.form = this.fb.group({
            inputVectors: this.fb.array([
                this.fb.group({ vector: '', operation: this.combinationOperators[1].value }),
                this.fb.group({ vector: '', operation: this.combinationOperators[1].value })
            ]),
            signatureVector: this.fb.control('', Validators.required),
            mergedInputs: this.fb.control(''),
        });
    }

    get inputVectors() {
        return this.form.controls["inputVectors"] as FormArray;
    }

    get operations() {
        return this.form.controls["operations"] as FormArray;
    }

    get signatureVector() {
        return this.form.controls["signatureVector"].value;
    }

    generateResult(): void {
        const inputVectors: any[] = this.form.get('inputVectors').value;
        inputVectors.forEach((control: any) => {
            if (!this.isValidInput(control.vector)) {
                alert('Enter only 0 or 1');
                return;
            }
        })

        const mergedIndexes: number[] = this.form.get('mergedInputs').value
            .split(',')
            .map((i: string) => parseInt(i.trim(), 10))
            .filter((i: number) => !isNaN(i))

        const signatureArr = this.form.get('signatureVector').value.split('').map(Number);
        inputVectors.reduce((acc, vector, reduceIndex) => {
            const rowsVector: number[] = acc.vector?.split('').map(Number);
            const colsVector: number[] = vector.vector?.split('').map(Number);

            const colHeaders = this.generateBitwiseValues(rowsVector.length);
            const rowHeaders = this.generateBitwiseValues(colsVector.length);
            const resultMatrix = rowsVector.map((row, i) =>
                colsVector.map((col, j) => {
                    const combinedBinaryValue = rowHeaders[i] + colHeaders[j];
                    const noNeedValue = new Set(mergedIndexes.map(i => combinedBinaryValue[i - 1])).size > 1;
                    if (noNeedValue) {
                        return '-';
                    }
                    const index = (row << 1) | col;
                    const signature = reduceIndex < inputVectors.length - 1 ? acc.operation.split('').map(Number) : signatureArr;
                    return signature[index] !== undefined ? signature[index] : 0;
                })
            );

            const resultString = resultMatrix.flat().filter(i => i !== '-').join('');
            if (reduceIndex = inputVectors.length - 1) {
                this.rowsVector = rowsVector;
                this.colsVector = colsVector;

                this.colHeaders = colHeaders;
                this.rowHeaders = rowHeaders;

                this.resultMatrix = resultMatrix;
                this.resultString = resultString;
            }
            return { vector: resultString, operation: vector.operation };
        })
    }

    isValidInput(vector: string): boolean {
        return /^[01]+$/.test(vector);
    }

    addVector(): void {
        this.inputVectors.push(this.fb.group({ vector: '', operation: this.combinationOperators[1].value }));
        this.cdr.detectChanges();
    }

    generateBitwiseValues(n: number) {
        if (n <= 0) return [];

        const bitLength = Math.ceil(Math.log2(n));
        const result: string[] = [];

        for (let i = 0; i < n; i++) {
            const binary = i.toString(2).padStart(bitLength, '0');
            result.push(binary);
        }

        return result;
    }
}
