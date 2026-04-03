def generate_test_map(v_str):
    v = [int(bit) for bit in v_str]
    n_len = len(v)
    n_vars = (n_len - 1).bit_length()
    
    # Generate C matrix
    for t in range(n_len):
        row = []
        # t as binary string
        t_bin = format(t, f'0{n_vars}b')
        for x in range(n_len):
            d_val = v[t] ^ v[x]
            if d_val == 0:
                row.append("." * n_vars)
            else:
                x_bin = format(x, f'0{n_vars}b')
                fault_str = ""
                for i in range(n_vars):
                    if x_bin[i] == '1':
                        # inverse of t_bin[i]
                        fault_str += '1' if t_bin[i] == '0' else '0'
                    else:
                        fault_str += '.'
                row.append(fault_str)
        print(f"{t_bin} | " + " ".join(row))

print("Vector: 11100111")
generate_test_map("11100111")

print("\nVector: 1000010000100001")
generate_test_map("1000010000100001")
