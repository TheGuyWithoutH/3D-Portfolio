using UnityEngine;

public class UnityRouting : MonoBehaviour
{
    [SerializeField] private string _url;
    
    public void RouteToUrl() {
        Application.ExternalEval("location.href = location.href + '" + _url + "'");
    }
}
