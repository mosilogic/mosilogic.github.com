import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-vector-to-graph',
    standalone: true,
    imports: [FormsModule, CommonModule],
    templateUrl: './vector-to-graph.component.html',
    styleUrls: ['./vector-to-graph.component.scss']
})
export class VectorToGraphComponent {
    inputVector: string = '';
    rows: number = 2;
    cols: number = 2;
    error: string = '';
    showResult: boolean = false;
    nodes: string[] = [];
    nodeCoords: { x: number; y: number }[] = [];
    nodeRadius: number[] = [];
    nodeInnerRadius: number[] = [];
    svgSize = 320;
    useVerticalLayout = false; // флаг для вертикального расположения
    nodeColors = ['#e3f2fd', '#ffe0b2', '#c8e6c9', '#fff9c4', '#f8bbd9', '#d1c4e9', '#b2dfdb', '#f0f4c3'];
    
    // Новые свойства для двудольных графов
    isBipartite: boolean = false;
    leftPartition: string[] = [];
    rightPartition: string[] = [];
    bipartiteLayout: boolean = false;
    // Вертикальный расклад для прямоугольных матриц (верх = столбцы, низ = строки)
    bipartiteVertical: boolean = false;
    // Разбиение по индексам вершин: 0 = левая доля (U), 1 = правая доля (V), -1 = неизвестно
    partitionByIndex: number[] = [];
    
    // Свойство для определения рефлексивных отношений
    hasReflexiveRelations: boolean = false;
    
    // Свойство для определения, нужно ли показывать поля ввода размеров
    showSizeInputs: boolean = false;
    
    // Флаг для отслеживания изменений в векторе
    private lastVectorLength: number = 0;

    // Настройка: скрывать изолированные вершины
    hideIsolated: boolean = false;
    // Индексы видимых вершин после фильтрации
    visibleNodeIndices: number[] = [];
    // Есть ли изолированные вершины в текущем графе
    hasIsolatedVertices: boolean = false;
    // Список рёбер для отрисовки
    edges: { from: number; to: number }[] = [];
    // Переключатель: принудительно отображать двудольный граф для квадратных матриц
    forceBipartite: boolean = false;

    get Math() {
        return Math;
    }

    // Время создания графа в миллисекундах
    graphCreationTime: number = 0;

    // Флаг: вектор образует квадратичную матрицу (длина — квадрат степени двойки)
    get isSquareVector(): boolean {
        const len = this.inputVector.length;
        if (len === 0) return false;
        if (!this.isPowerOfTwo(len)) return false;
        const sqrt = Math.sqrt(len);
        return Number.isInteger(sqrt);
    }

    // Получение бинарного индекса для отображения в таблице
    getBinaryIndex(index: number, maxSize: number): string {
        const n = Math.max(1, Math.ceil(Math.log2(maxSize)));
        return index.toString(2).padStart(n, '0');
    }

    // Бинарные индексы для строк/столбцов отдельно, чтобы для 2 показывать 0/1
    getBinaryIndexRow(index: number): string {
        const n = Math.max(1, Math.ceil(Math.log2(this.rows)));
        return index.toString(2).padStart(n, '0');
    }
    getBinaryIndexCol(index: number): string {
        const n = Math.max(1, Math.ceil(Math.log2(this.cols)));
        return index.toString(2).padStart(n, '0');
    }

    // Проверка, является ли число степенью двойки
    private isPowerOfTwo(n: number): boolean {
        return n > 0 && (n & (n - 1)) === 0;
    }

    // Умное определение размеров матрицы
    private determineMatrixSize(vectorLength: number) {
        const sqrt = Math.sqrt(vectorLength);
        
        if (Number.isInteger(sqrt)) {
            // Квадратная матрица - автоматически определяем размеры
            this.rows = sqrt;
            this.cols = sqrt;
            this.showSizeInputs = false;
        } else {
            // Неквадратная матрица - показываем поля ввода
            this.showSizeInputs = true;
            // Если размеры не заданы, устанавливаем значения по умолчанию
            if (this.rows * this.cols !== vectorLength) {
                // Находим наиболее сбалансированные размеры
                const [factor1, factor2] = this.findBalancedFactors(vectorLength);
                this.rows = factor1;
                this.cols = factor2;
            }
        }
    }

    // Автоматическое определение необходимости показа полей ввода
    onVectorChange() {
        const currentLength = this.inputVector.length;
        
        // Проверяем, изменилась ли длина вектора
        if (currentLength !== this.lastVectorLength) {
            this.lastVectorLength = currentLength;
            
            // Проверяем, является ли длина степенью двойки
            if (this.isPowerOfTwo(currentLength) && currentLength > 0) {
                const sqrt = Math.sqrt(currentLength);
                
                if (Number.isInteger(sqrt)) {
                    // Квадратная матрица - скрываем поля ввода
                    this.showSizeInputs = false;
                    this.rows = sqrt;
                    this.cols = sqrt;
                } else {
                    // Неквадратная матрица - показываем поля ввода
                    this.showSizeInputs = true;
                    // Устанавливаем наиболее сбалансированные размеры по умолчанию
                    const [factor1, factor2] = this.findBalancedFactors(currentLength);
                    this.rows = factor1;
                    this.cols = factor2;
                }
            } else {
                // Не степень двойки - скрываем поля ввода
                this.showSizeInputs = false;
            }
        }
    }

    // Поиск наиболее сбалансированной пары множителей для длины вектора
    private findBalancedFactors(n: number): [number, number] {
        let bestPair: [number, number] = [1, n];
        let minDifference = n - 1;
        
        for (let i = 1; i <= Math.sqrt(n); i++) {
            if (n % i === 0) {
                const factor1 = i;
                const factor2 = n / i;
                const difference = Math.abs(factor1 - factor2);
                
                if (difference < minDifference) {
                    minDifference = difference;
                    bestPair = [factor1, factor2];
                }
            }
        }
        
        return bestPair;
    }

    // Генерация меток вершин на основе строк и столбцов
    private generateNodeLabels() {
        this.nodes = [];
        
        // Проверяем, нужен ли двудольный граф
        const shouldBeBipartite = this.shouldCreateBipartiteGraph();
        
        if (shouldBeBipartite) {
            // Двудольный граф: отдельная нумерация для строк (U) и столбцов (V)
            // Битовая длина рассчитывается независимо для каждой доли
            const nU = Math.max(1, Math.ceil(Math.log2(this.rows)));
            const nV = Math.max(1, Math.ceil(Math.log2(this.cols)));
            // Всегда создаём [U(rows)..., V(cols)...]
            for (let i = 0; i < this.rows; i++) this.nodes.push(i.toString(2).padStart(nU, '0'));
            for (let j = 0; j < this.cols; j++) this.nodes.push(j.toString(2).padStart(nV, '0'));
        } else {
            // Обычный граф
            const maxIndex = Math.max(this.rows, this.cols);
            const n = Math.ceil(Math.log2(maxIndex));
            for (let i = 0; i < maxIndex; i++) {
                this.nodes.push(i.toString(2).padStart(n, '0'));
            }
        }
    }

    // Определение, должен ли граф иметь рефлексивные отношения
    private shouldHaveReflexiveRelations(rows: number, cols: number): boolean {
        // Включаем петли для всех размеров, включая 2×2
        return true;
    }

    onConvert() {
        this.error = '';
        const len = this.inputVector.length;
        if (!/^[01]+$/.test(this.inputVector) || len < 1 || len > 1024) {
            this.error = 'The vector length must contain 1-1024 digits (0 or 1)';
            this.showResult = false;
            return;
        }
        
        // Проверяем, что общее количество элементов кратно степени двойки
        if (!this.isPowerOfTwo(len)) {
            this.error = 'The vector length must be a power of 2 (1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024)';
            this.showResult = false;
            return;
        }
        
        // Начинаем измерение времени создания графа
        const startTime = performance.now();
        
        // Умное определение размеров матрицы
        this.determineMatrixSize(len);
        
        // Проверяем, что произведение строк и столбцов равно длине вектора
        const expectedLength = this.rows * this.cols;
        if (len !== expectedLength) {
            this.error = `Vector length (${len}) must equal rows × cols (${this.rows} × ${this.cols} = ${expectedLength})`;
            this.showResult = false;
            return;
        }
        
        // Генерируем имена вершин
        this.generateNodeLabels();
        // Предвычисляем радиусы вершин под длину меток
        this.computeNodeRadii();
        
        // Определяем, должен ли граф иметь рефлексивные отношения
        this.hasReflexiveRelations = this.shouldHaveReflexiveRelations(this.rows, this.cols);
        
        // Проверяем, является ли граф двудольным
        this.checkBipartite();
        
        // Подстроим размер полотна под длину рядов для лучшей читаемости
        this.adjustSvgSize();

        // Генерируем координаты в зависимости от типа графа
        this.generateCoordinates();
        // Строим рёбра для отрисовки
        this.buildEdges();
        // Рассчитываем видимые вершины с учётом hideIsolated
        this.computeVisibleNodes();
        
        // Заканчиваем измерение времени
        const endTime = performance.now();
        console.log('Graph creation time:', endTime, startTime, endTime - startTime);
        this.graphCreationTime = endTime - startTime;
        
        this.showResult = true;
    }

    // Адаптация размера SVG для длинных прямоугольных матриц (делаем шире)
    private adjustSvgSize() {
        // Количество узлов в длинном ряду при текущем раскладе
        const rowCount = this.rows;
        const colCount = this.cols;
        const longest = Math.max(rowCount, colCount);
        // Базовый размер и шаг на каждый узел для читаемости
        const base = 320;
        const per = 45; // уменьшили шаг на узел для меньших отступов
        // Минимум базовый, максимум зависит от самого длинного ряда
        this.svgSize = Math.max(base, 100 + longest * per);
        
        // Определяем, нужен ли вертикальный макет на основе размера SVG
        // Если SVG больше 600px, используем вертикальный макет
        this.useVerticalLayout = this.svgSize > 600;
    }

    // Проверка двудольности графа
    private checkBipartite() {
        const N = this.nodes.length;
        
        // Проверяем, нужен ли двудольный граф на основе структуры (прямоугольная/квадратная) и флага
        const shouldBeBipartite = this.shouldCreateBipartiteGraph();
        
        if (shouldBeBipartite) {
            // Двудольный граф
            this.isBipartite = true;
            this.bipartiteLayout = true;
            // Всегда вертикально (сверху вниз) для двудольных графов
            this.bipartiteVertical = true;
            
            // Создаем разделение долей в соответствии с порядком узлов
            // Квадратная: [U(rows)..., V(cols)...]
            // Прямоугольная (вертикальная): [V(cols)..., U(rows)...]
            this.partitionByIndex = new Array(this.nodes.length).fill(-1);
            this.leftPartition = [];
            this.rightPartition = [];
            if (this.bipartiteVertical) {
                // верхние (первые) = U, нижние (последние) = V
                for (let i = 0; i < this.rows; i++) {
                    this.partitionByIndex[i] = 0; // U (верх)
                    this.leftPartition.push(this.nodes[i]);
                }
                for (let j = 0; j < this.cols; j++) {
                    const idx = this.rows + j;
                    this.partitionByIndex[idx] = 1; // V (низ)
                    this.rightPartition.push(this.nodes[idx]);
                }
            } else {
                // классический порядок: U затем V
                for (let i = 0; i < this.rows; i++) {
                    this.partitionByIndex[i] = 0; // U
                    this.leftPartition.push(this.nodes[i]);
                }
                for (let j = 0; j < this.cols; j++) {
                    const idx = this.rows + j;
                    this.partitionByIndex[idx] = 1; // V
                    this.rightPartition.push(this.nodes[idx]);
                }
            }
        } else {
            // Обычный граф
            this.isBipartite = false;
            this.bipartiteLayout = false;
            this.leftPartition = [];
            this.rightPartition = [];
            this.partitionByIndex = new Array(N).fill(-1);
        }
    }

    // Определение, нужно ли создавать двудольный граф
    private shouldCreateBipartiteGraph(): boolean {
        // Прямоугольные матрицы: всегда двудольный граф
        if (this.rows !== this.cols) {
            return true;
        }
        // Квадратные матрицы: двудольный только если включен флаг forceBipartite
        if (this.rows === this.cols) {
            return this.forceBipartite;
        }
        return false;
    }

    // Проверка: в каждой строке ровно одна '1'
    private isFunctionalRowMapping(): boolean {
        for (let i = 0; i < this.rows; i++) {
            let onesInRow = 0;
            for (let j = 0; j < this.cols; j++) {
                const idx = i * this.cols + j;
                if (this.inputVector[idx] === '1') onesInRow++;
                if (onesInRow > 1) return false;
            }
            if (onesInRow !== 1) return false;
        }
        return true;
    }

    // BFS для проверки двудольности
    private bfsCheckBipartite(adjacencyMatrix: boolean[][], start: number, colors: number[]): boolean {
        const queue: number[] = [start];
        colors[start] = 0;
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            
            for (let neighbor = 0; neighbor < adjacencyMatrix.length; neighbor++) {
                if (!adjacencyMatrix[current][neighbor]) continue;
                // Петли не нарушают двудольность, пропускаем их
                if (neighbor === current) continue;
                if (colors[neighbor] === -1) {
                    colors[neighbor] = 1 - colors[current];
                    queue.push(neighbor);
                } else if (colors[neighbor] === colors[current]) {
                    return false; // Конфликт цветов
                }
            }
        }
        
        return true;
    }

    // Построение матрицы смежности
    private buildAdjacencyMatrix(): boolean[][] {
        const totalNodes = this.nodes.length;
        const matrix: boolean[][] = Array(totalNodes).fill(null).map(() => Array(totalNodes).fill(false));
        
        // Проверяем, нужен ли двудольный граф
        const shouldBeBipartite = this.shouldCreateBipartiteGraph();
        
        if (shouldBeBipartite) {
            // Двудольный граф
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const vectorIndex = i * this.cols + j;
                    if (this.inputVector[vectorIndex] === '1') {
                        // Связываем строку i с столбцом j
                        const rowNodeIndex = i; // Строки в левой доле
                        const colNodeIndex = this.rows + j; // Столбцы в правой доле, метки совпадают (00..11)
                        matrix[rowNodeIndex][colNodeIndex] = true;
                    }
                }
            }
        } else {
            // Обычный граф
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const vectorIndex = i * this.cols + j;
                    if (this.inputVector[vectorIndex] === '1') {
                        // Связываем вершину строки i с вершиной столбца j
                        const rowNodeIndex = i;
                        const colNodeIndex = j;
                        matrix[rowNodeIndex][colNodeIndex] = true;
                    }
                }
            }
        }
        
        // Если граф должен иметь рефлексивные отношения, добавляем петли
        if (this.hasReflexiveRelations) {
            for (let i = 0; i < totalNodes; i++) {
                matrix[i][i] = true;
            }
        }
        
        return matrix;
    }

    // Формирование списка рёбер для отрисовки
    private buildEdges() {
        this.edges = [];
        const shouldBeBip = this.shouldCreateBipartiteGraph();
        if (shouldBeBip) {
            // U (строки) сверху, V (столбцы) снизу; рёбра направлены сверху вниз
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const vectorIndex = i * this.cols + j;
                    if (this.inputVector[vectorIndex] === '1') {
                        const from = i; // U index in nodes
                        const to = this.rows + j; // V index in nodes
                        this.edges.push({ from, to });
                    }
                }
            }
        } else {
            // Обычный граф: вершины 0..max-1, рёбра по матрице
            const maxIndex = Math.max(this.rows, this.cols);
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const vectorIndex = i * this.cols + j;
                    if (this.inputVector[vectorIndex] === '1') {
                        const from = i % maxIndex;
                        const to = j % maxIndex;
                        this.edges.push({ from, to });
                    }
                }
            }
        }
    }

    // Подсчёт изолированных вершин и формирование списка видимых
    public computeVisibleNodes() {
        // Строим неориентированную матрицу без петель, чтобы
        // игнорировать рефлексивные петли при определении изолированных вершин
        const directed = this.buildAdjacencyMatrix();
        const adj = this.buildUndirectedNoLoopAdjacency(directed);
        const N = adj.length;
        this.visibleNodeIndices = [];
        let isolated = 0;
        for (let i = 0; i < N; i++) {
            let degree = 0;
            for (let j = 0; j < N; j++) {
                if (adj[i][j]) degree++;
            }
            if (degree === 0) isolated++;
            if (!this.hideIsolated || degree > 0) {
                this.visibleNodeIndices.push(i);
            }
        }
        this.hasIsolatedVertices = isolated > 0;
    }

    // Неориентированная матрица без петель: A[i][j] = A[j][i] = true, если существует ребро i→j или j→i, i != j
    private buildUndirectedNoLoopAdjacency(directed: boolean[][]): boolean[][] {
        const N = directed.length;
        const undirected: boolean[][] = Array(N).fill(null).map(() => Array(N).fill(false));
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                if (directed[i][j] || directed[j][i]) {
                    undirected[i][j] = true;
                    undirected[j][i] = true;
                }
            }
        }
        return undirected;
    }

    // Генерация координат для вершин
    private generateCoordinates() {
        const N = this.nodes.length;
        
        if (this.bipartiteLayout) {
            // Двудольный граф
            if (this.bipartiteVertical) {
                this.generateBipartiteVerticalCoordinates();
            } else {
                // две колонки
                this.generateBipartiteCoordinates();
            }
        } else if (N === 2) {
            // Для двух вершин — по горизонтали
            const y = this.svgSize / 2;
            this.nodeCoords = [
                { x: this.svgSize / 2 - 60, y },
                { x: this.svgSize / 2 + 60, y }
            ];
        } else {
            // По кругу для обычных графов
            this.generateCircularCoordinates();
        }
    }

    // Координаты для двудольного графа (по индексам)
    private generateBipartiteCoordinates() {
        const N = this.nodes.length;
        const leftCount = this.partitionByIndex.filter(p => p === 0).length;
        const rightCount = this.partitionByIndex.filter(p => p === 1).length;
        
        // Увеличиваем расстояние между узлами для больших графов
        const minSpacing = 50; // минимальное расстояние между узлами
        const maxSpacing = 80; // максимальное расстояние между узлами
        const spacing = Math.min(maxSpacing, Math.max(minSpacing, this.svgSize * 0.4 / Math.max(Math.max(leftCount, rightCount) - 1, 1)));
        
        // Левая колонка (раздел U)
        const leftX = this.svgSize * 0.2;
        const leftSpacing = spacing;
        const leftStartY = (this.svgSize - (leftCount - 1) * leftSpacing) / 2;
        
        // Правая колонка (раздел V)
        const rightX = this.svgSize * 0.8;
        const rightSpacing = spacing;
        const rightStartY = (this.svgSize - (rightCount - 1) * rightSpacing) / 2;
        
        this.nodeCoords = new Array(N);
        let leftPlaced = 0;
        let rightPlaced = 0;
        for (let i = 0; i < N; i++) {
            if (this.partitionByIndex[i] === 0) {
                this.nodeCoords[i] = { x: leftX, y: leftStartY + leftPlaced * leftSpacing };
                leftPlaced++;
            } else {
                this.nodeCoords[i] = { x: rightX, y: rightStartY + rightPlaced * rightSpacing };
                rightPlaced++;
            }
        }
    }

    // Вертикальные координаты для прямоугольных матриц: верх = столбцы (V), низ = строки (U)
    private generateBipartiteVerticalCoordinates() {
        const N = this.nodes.length;
        const topCount = this.rows;   // U сверху
        const bottomCount = this.cols; // V снизу
        const topY = this.svgSize * 0.28;
        const bottomY = this.svgSize * 0.72;
        const centerX = this.svgSize / 2;
        const total = Math.max(topCount, bottomCount);
        
        // Увеличиваем расстояние между узлами для больших графов
        const minSpacing = 50; // минимальное расстояние между узлами
        const maxSpacing = 80; // максимальное расстояние между узлами
        const xSpacing = Math.min(maxSpacing, Math.max(minSpacing, this.svgSize * 0.6 / Math.max(total - 1, 1)));
        
        const topStartX = centerX - ((topCount - 1) * xSpacing) / 2;
        const bottomStartX = centerX - ((bottomCount - 1) * xSpacing) / 2;

        this.nodeCoords = new Array(N);
        // Верхний ряд: U идут первыми в nodes
        for (let i = 0; i < topCount; i++) {
            this.nodeCoords[i] = { x: topStartX + i * xSpacing, y: topY };
        }
        // Нижний ряд: V идут после U
        for (let j = 0; j < bottomCount; j++) {
            const idx = topCount + j;
            this.nodeCoords[idx] = { x: bottomStartX + j * xSpacing, y: bottomY };
        }
    }

    // Координаты по кругу для обычных графов
    private generateCircularCoordinates() {
        const N = this.nodes.length;
        const cx = this.svgSize / 2;
        const cy = this.svgSize / 2;
        // Делаем радиус пропорциональным размеру SVG, чтобы граф заполнял полотно
        // Оставляем небольшой внутренний отступ для подписей и стрелок
        const padding = 60;
        const R = Math.max(120, (this.svgSize / 2) - padding);
        
        this.nodeCoords = this.nodes.map((_, i) => {
            const angle = (2 * Math.PI * i) / Math.max(N, 1) - Math.PI / 2;
            return {
                x: cx + R * Math.cos(angle),
                y: cy + R * Math.sin(angle)
            };
        });
    }

    // Хелперы для шаблона
    isNodeLeft(index: number): boolean {
        return this.bipartiteLayout && this.partitionByIndex[index] === 0;
    }
    isNodeRight(index: number): boolean {
        return this.bipartiteLayout && this.partitionByIndex[index] === 1;
    }

    // Предвычисление радиусов узлов в зависимости от длины меток
    private computeNodeRadii() {
        const base = 16; // немного уменьшаем общий диаметр
        this.nodeRadius = this.nodes.map(label => {
            const len = (label ?? '').length;
            const extra = Math.max(0, len - 2) * 2; // чуть меньше наращиваем радиус за символ
            return Math.min(base + extra, 28);
        });
        // Делаем цветной круг (между внешним и белым) тоньше (примерно в 2 раза)
        this.nodeInnerRadius = this.nodeRadius.map(r => Math.floor(r * 0.80));
    }

    // Сброс результата при изменении inputVector
    ngOnInit() {}
    ngOnChanges() {
        this.showResult = false;
    }

    // SVG: дуга для петли
    getLoopPath(x: number, y: number, idx: number, total: number, loopRadius: number = 28): string {
        const r = loopRadius;
        const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
        const cx = x + r * Math.cos(angle - Math.PI / 6);
        const cy = y + r * Math.sin(angle - Math.PI / 6);
        return `M${x} ${y} Q${cx} ${cy} ${x} ${y}`;
    }

    // SVG: точка на окружности радиуса r от центра (x1, y1) в направлении (x2, y2)
    getEdgePoint(x1: number, y1: number, x2: number, y2: number, r: number = 28) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ratio = r / len;
        return {
            x: x1 + dx * ratio,
            y: y1 + dy * ratio
        };
    }

    // SVG: выраженная петля сбоку от круга (круглее), при этом начало/конец остаются прежними
    // Начало: точка на окружности с углом angle; Конец: точка на окружности с углом angle + 0.65
    // Контрольные точки ставим по нормалям к окружности в начале и конце, на расстоянии baseR + r
    getExpressiveLoopPath(
        x: number,
        y: number,
        idx: number,
        total: number,
        r: number = 28,
        baseR: number = 18
    ): string {
        // Небольшой поворот петли вокруг узла, чтобы не пересекать обод
        const rotation = 0.25; // ~14°
        const angle0 = (2 * Math.PI * idx) / Math.max(total, 1) - Math.PI / 2 + rotation;
        const startX = x + baseR * Math.cos(angle0);
        const startY = y + baseR * Math.sin(angle0);
        // Длина дуги без изменений относительно новой стартовой точки
        const endAngle = angle0 + 0.20;
        const endX = x + baseR * Math.cos(endAngle);
        const endY = y + baseR * Math.sin(endAngle);
        // Нормали наружу в начальной и конечной точках
        const perpStart = angle0 - Math.PI / 2;
        const perpEnd = endAngle - Math.PI / 2;
        // Делаем дугу шире: выносим контрольные точки дальше и чуть увеличиваем угловой развод
        // Уже петля (ближе к узлу), но с более сильным угловым разводом
        // Уже петля: контрольные точки ближе к узлу
        const outDist1 = baseR + r * 1.15;
        const outDist2 = baseR + r * 1.15;
        const spread = 0.38; // ещё больше раскрываем по углу
        const c1x = x + outDist1 * Math.cos(perpStart - spread);
        const c1y = y + outDist1 * Math.sin(perpStart - spread);
        const c2x = x + outDist2 * Math.cos(perpEnd + spread);
        const c2y = y + outDist2 * Math.sin(perpEnd + spread);
        return `M${startX} ${startY} C${c1x} ${c1y},${c2x} ${c2y},${endX} ${endY}`;
    }

    // Вычисление овальных контуров разделов на основе координат текущих вершин
    getPartitionOvals() {
        if (!this.bipartiteLayout || this.nodeCoords.length === 0) return null;
        const leftPoints = this.nodeCoords.filter((_, i) => this.partitionByIndex[i] === 0);
        const rightPoints = this.nodeCoords.filter((_, i) => this.partitionByIndex[i] === 1);
        if (leftPoints.length === 0 || rightPoints.length === 0) return null;
        const paddingY = 40;
        const paddingX = 40;
        const leftMinY = Math.min(...leftPoints.map(p => p.y));
        const leftMaxY = Math.max(...leftPoints.map(p => p.y));
        const leftMinX = Math.min(...leftPoints.map(p => p.x));
        const leftMaxX = Math.max(...leftPoints.map(p => p.x));
        const rightMinY = Math.min(...rightPoints.map(p => p.y));
        const rightMaxY = Math.max(...rightPoints.map(p => p.y));
        const rightMinX = Math.min(...rightPoints.map(p => p.x));
        const rightMaxX = Math.max(...rightPoints.map(p => p.x));
        return {
            left: {
                x: (leftMinX + leftMaxX) / 2,
                y: (leftMinY + leftMaxY) / 2,
                width: Math.max(leftMaxX - leftMinX + paddingX, 80),
                height: Math.max(leftMaxY - leftMinY + paddingY, 80)
            },
            right: {
                x: (rightMinX + rightMaxX) / 2,
                y: (rightMinY + rightMaxY) / 2,
                width: Math.max(rightMaxX - rightMinX + paddingX, 80),
                height: Math.max(rightMaxY - rightMinY + paddingY, 80)
            }
        };
    }
}
