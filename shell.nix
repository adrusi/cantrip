{
  pkgs ? import <nixpks> { },
  ...
}:
pkgs.mkShell {
  nativeBuildInputs = [
    pkgs.nodejs
  ];

  shellHook = ''
    export PROJECT_ROOT="$PWD"
  '';
}
