#!/usr/bin/env bash
# Bash completion for oxf

_oxf() {
  local cur prev cword
  local -a words

  COMPREPLY=()
  words=("${COMP_WORDS[@]}")
  cword=${COMP_CWORD}
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD - 1]}"

  local commands="lookup sync status doctor config"
  local config_keys="syncManifestUrl enrichmentCacheTtlHours timeoutMs color"

  if [[ ${cword} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "${commands}" -- "${cur}"))
    return 0
  fi

  case "${words[1]}" in
    lookup)
      case "${prev}" in
        --timeout)
          return 0
          ;;
      esac

      COMPREPLY=($(compgen -W "--json --more --online --timeout --no-color" -- "${cur}"))
      return 0
      ;;
    sync)
      case "${prev}" in
        --channel)
          COMPREPLY=($(compgen -W "stable latest" -- "${cur}"))
          return 0
          ;;
        --manifest)
          COMPREPLY=($(compgen -f -- "${cur}"))
          return 0
          ;;
      esac

      COMPREPLY=($(compgen -W "--channel --manifest stable latest" -- "${cur}"))
      return 0
      ;;
    config)
      if [[ ${cword} -eq 2 ]]; then
        COMPREPLY=($(compgen -W "get set" -- "${cur}"))
        return 0
      fi

      if [[ ${cword} -eq 3 ]]; then
        COMPREPLY=($(compgen -W "${config_keys}" -- "${cur}"))
        return 0
      fi

      if [[ ${words[2]} == "set" && ${cword} -eq 4 ]]; then
        case "${words[3]}" in
          color)
            COMPREPLY=($(compgen -W "true false" -- "${cur}"))
            return 0
            ;;
          syncManifestUrl)
            COMPREPLY=($(compgen -f -- "${cur}"))
            return 0
            ;;
        esac
      fi

      return 0
      ;;
  esac
}

complete -F _oxf oxf
