{
  pkgs ? import <nixpks> { },
  ...
}:
pkgs.mkShell {
  nativeBuildInputs = [
    pkgs.bun
    pkgs.nodejs
  ];

  shellHook = ''
    export PROJECT_ROOT="$PWD"
  '';
}
