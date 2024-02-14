# apply_codemod.py
import sys
import subprocess
import libcst as cst
from libcst.codemod import CodemodContext
from libcst.metadata import ParentNodeProvider

# Credit to SeanGrove for the original version of this codemod

class SQLTransformer(cst.CSTTransformer):

    # Add the filename to the context so we can use it in the transformer
    def __init__(self, filename:str):
        self.filename = filename
        self.filename_without_extension = filename.rsplit(".", 1)[0] if "." in filename else filename

    def leave_Call(self, node: cst.Call, updated_node: cst.Call):
        if isinstance(node.func, cst.Name) and node.func.value == "sql":
            print("Found sql call")
            if len(node.args) < 2:
                raise ValueError("The sql function must have two string arguments.")
            first_arg = node.args[0].value
            second_arg = node.args[1].value
            if not isinstance(first_arg, cst.SimpleString) or not isinstance(second_arg, cst.SimpleString):
                raise ValueError("Both arguments to sql must be strings.")
            print(f"First argument to sql: {first_arg.value}")
            print(f"Second argument to sql: {second_arg.value}")

            
            # CALL PG TYPED HERE!

            # Run the resulting JavaScript file with Node.js
            function_name = second_arg.value.lstrip('"').rstrip('"')  # Remove the double quotes
            sql_query = first_arg.value.lstrip('"').rstrip('"')  # Remove the double quotes

            # Convert the function_name to correct SQL comment syntax
            ts_filename = f"{self.filename_without_extension}.ts"

            


            # Combine the function name comment and the SQL query
            sql_named_query = f"""
            import {{ sql }} from '@pgtyped/runtime';

            // Welcome to the worst hack of all time

            const {function_name} =sql`\n{sql_query}`;\n\n"""

            with open(ts_filename, "w") as f:
                f.write(sql_named_query)
            print(f"Writing SQL to {ts_filename}")
            f.close()

            cfg = 'default_config.json'
            file_override = ts_filename
            print(f"Overriding file to {file_override}")
            # Run index.js, pass default config, DON'T WATCH, and pass the sql file to override to single file mode
            result = subprocess.run(['node', '../lib/index.js', '-c', cfg, '-f', file_override], check=True, capture_output=True, text=True)
            print(result.stdout)

            # # DEBUGGING SUBPROCESS
            # process = subprocess.Popen(['node', '../lib/index.js', '-c', cfg, '-f', file_override], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            # # Print the output in real-time
            # for line in process.stdout:
            #     print(line.decode().strip())

            # # Wait for the process to finish and get the exit code
            # exit_code = process.wait()

            # if exit_code != 0:
            #     print(f"Process exited with code {exit_code}")
            new_args = list(node.args)
            new_args[0] = cst.Arg(value=cst.SimpleString(f'"processed!"'))


            if len(node.args) >= 2:
                print("Replacing second argument")
                new_args[1] = cst.Arg(value=cst.SimpleString("'processed'"))
                return node.with_changes(args=tuple(new_args))
            else:
                print("Adding second argument")
                new_args.append(cst.Arg(value=cst.SimpleString("'processed'")))
                return node.with_changes(args=tuple(new_args))

        return updated_node

    def leave_Assign(self, original_node: cst.Assign, updated_node: cst.Assign):
        # Check if the value being assigned is a call to `sql`
        if (
            isinstance(updated_node.value, cst.Call)
            and isinstance(updated_node.value.func, cst.Name)
            and updated_node.value.func.value == "sql"
        ):
            # Create a new AnnAssign node with the modified annotation
            new_annotation = cst.Annotation(
                annotation=cst.Subscript(
                    value=cst.Name(value="Union"),
                    slice=[
                        cst.SubscriptElement(
                            slice=cst.Index(
                                value=cst.Subscript(
                                    value=cst.Name(value="List"),
                                    slice=[
                                        cst.SubscriptElement(
                                            slice=cst.Index(value=cst.Name(value="str"))
                                        )
                                    ],
                                )
                            )
                        ),
                        cst.SubscriptElement(slice=cst.Index(value=cst.Name(value="None"))),
                    ],
                )
            )

            return cst.AnnAssign(
                target=updated_node.targets[0].target,
                annotation=new_annotation,
                value=updated_node.value,
                equal=cst.AssignEqual(),
            )

        return updated_node


def apply_codemod_to_file(filename: str):
    with open(filename, "r") as f:
        source_code = f.read()

    # Parse the source code into a CST
    tree = cst.parse_module(source_code)

    # Apply the codemod
    transformer = SQLTransformer(filename)
    modified_tree = tree.visit(transformer)

    print(f"\n\n\n\nModified code:\n{modified_tree.code}")

    # Write the modified code back to the file
    filename_without_extension = filename.rsplit(".", 1)[0] if "." in filename else filename
    with open(f"{filename_without_extension}_processed.py", "w") as f:
        f.write(modified_tree.code)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python apply_codemod.py <filename>")
        sys.exit(1)

    apply_codemod_to_file(sys.argv[1])