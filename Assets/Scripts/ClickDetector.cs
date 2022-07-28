using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace DefaultNamespace
{
    public class ClickDetector : MonoBehaviour
    {
        private MouseDetection _mouseDetection;

        private void Start()
        {
            _mouseDetection = GetComponentInParent<MouseDetection>();
        }

        private void OnMouseOver()
        { 
            _mouseDetection.OnHover();
        }

        private void OnMouseExit()
        {
            _mouseDetection.OnExit();
        }
    }
}