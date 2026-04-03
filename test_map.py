def calculate_matrices(vector_str):
    v = [int(x) for x in vector_str]
    n = len(v)
    
    L = []
    for t in range(n):
        row = []
        for x in range(n):
            # Cartesian xor: f(t) ^ f(t ^ x)
            val = v[t] ^ v[t ^ x]
            row.append(val)
        L.append(row)
        
    print("Vector:", vector_str)
    print("L-Matrix:")
    for row in L:
        print("".join(map(str, row)))

calculate_matrices("11100111")
calculate_matrices("1000010000100001")
